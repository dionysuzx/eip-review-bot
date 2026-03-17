import { Octokit } from "../../types";
import checkAssets from "../assets";

jest.mock("@actions/github", () => ({
    __esModule: true,
    default: {
        context: {
            repo: {
                owner: "ethereum",
                repo: "EIPs",
            },
        },
    },
}));

jest.mock("../../process", () => ({
    __esModule: true,
    default: jest.fn(
        (
            _o: unknown,
            _c: unknown,
            files: { filename: string; contents?: string }[],
        ) =>
            files.flatMap((f) => {
                const authors = f.contents
                    ?.match(/author:\s*(.+)/)?.[1]
                    ?.match(/@(\w+)/g)
                    ?.map((s) => s.slice(1));
                if (!authors?.length) return [];
                return [
                    {
                        name: "authors",
                        reviewers: authors,
                        min: 1,
                        pr_approval: true,
                        annotation: { file: f.filename },
                    },
                ];
            }),
    ),
}));

const frontmatter =
    "---\nstatus: Draft\ncategory: ERC\nauthor: Alice (@alice), Bob (@bob)\n---\nHello!";
function makeFakeOctokit() {
    return {
        rest: {
            repos: {
                getContent: jest.fn().mockResolvedValue({
                    data: frontmatter,
                }),
            },
        },
    } as unknown as Octokit;
}

describe("checkAssets", () => {
    test("Should require author approval for asset-only EIP changes", async () => {
        const fakeOctokit = makeFakeOctokit();
        const result = await checkAssets(
            fakeOctokit,
            { erc: ["editor1", "editor2", "editor3"] },
            [
                {
                    filename: "assets/eip-1234/image.png",
                    status: "modified",
                },
            ],
        );
        expect(result).toMatchObject([
            {
                name: "authors",
                reviewers: ["alice", "bob"],
                min: 1,
                pr_approval: true,
                annotation: {
                    file: "EIPS/eip-1234.md",
                },
            },
        ]);
    });

    test("Should require author approval for asset-only ERC changes", async () => {
        const fakeOctokit = makeFakeOctokit();
        const result = await checkAssets(
            fakeOctokit,
            { erc: ["editor1", "editor2", "editor3"] },
            [
                {
                    filename: "assets/erc-5678/diagram.svg",
                    status: "modified",
                },
            ],
        );
        expect(result).toMatchObject([
            {
                name: "authors",
                reviewers: ["alice", "bob"],
                min: 1,
                pr_approval: true,
                annotation: {
                    file: "ERCS/erc-5678.md",
                },
            },
        ]);
    });

    test("Should skip when parent EIP file is also in the PR", async () => {
        const fakeOctokit = makeFakeOctokit();
        const result = await checkAssets(
            fakeOctokit,
            { erc: ["editor1", "editor2", "editor3"] },
            [
                {
                    filename: "assets/eip-1234/image.png",
                    status: "modified",
                },
                {
                    filename: "EIPS/eip-1234.md",
                    status: "modified",
                    contents: frontmatter,
                    previous_contents: frontmatter,
                },
            ],
        );
        expect(result).toEqual([]);
    });

    test("Should return empty for non-asset files", async () => {
        const fakeOctokit = makeFakeOctokit();
        const result = await checkAssets(
            fakeOctokit,
            { erc: ["editor1", "editor2", "editor3"] },
            [
                {
                    filename: "EIPS/eip-1234.md",
                    status: "modified",
                    contents: frontmatter,
                    previous_contents: frontmatter,
                },
            ],
        );
        expect(result).toEqual([]);
    });
});
