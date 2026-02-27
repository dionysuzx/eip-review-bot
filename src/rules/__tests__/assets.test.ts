import processFiles from "../../process";
import { Octokit } from "../../types";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("asset-only PRs with pre-populated markdown", () => {
    test("Should return only authors rule with pr_approval for asset-only ERC change", async () => {
        const result = await processFiles(
            fakeOctokit,
            { erc: ["editor-a", "editor-b", "editor-c"] },
            [
                {
                    filename: "assets/erc-7730/schema.json",
                    status: "modified",
                    contents: '{"type": "object"}',
                    previous_contents: '{"type": "string"}',
                },
                {
                    filename: "ERCS/erc-7730.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Alice (@alice), Bob (@bob)\n---\nHello!",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Alice (@alice), Bob (@bob)\n---\nHello!",
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
                    file: "ERCS/erc-7730.md",
                },
            },
        ]);
        expect(result).toHaveLength(1);
    });

    test("Should return only authors rule with pr_approval for asset-only EIP change", async () => {
        const result = await processFiles(
            fakeOctokit,
            { erc: ["editor-a", "editor-b", "editor-c"] },
            [
                {
                    filename: "assets/eip-1234/diagram.png",
                    status: "added",
                    contents: "binary-content",
                },
                {
                    filename: "EIPS/eip-1234.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Charlie (@charlie)\n---\nContent",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Charlie (@charlie)\n---\nContent",
                },
            ],
        );

        expect(result).toMatchObject([
            {
                name: "authors",
                reviewers: ["charlie"],
                min: 1,
                pr_approval: true,
                annotation: {
                    file: "EIPS/eip-1234.md",
                },
            },
        ]);
        expect(result).toHaveLength(1);
    });

    test("Should not duplicate rules when markdown file is already changed", async () => {
        const result = await processFiles(
            fakeOctokit,
            { erc: ["editor-a", "editor-b", "editor-c"] },
            [
                {
                    filename: "assets/erc-7730/schema.json",
                    status: "modified",
                    contents: '{"type": "object"}',
                    previous_contents: '{"type": "string"}',
                },
                {
                    filename: "ERCS/erc-7730.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Alice (@alice)\n---\nOld content",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Alice (@alice)\n---\nNew content",
                },
            ],
        );

        // Should only have one authors rule (no duplicate from assets rule)
        const authorsRules = result.filter((r) => r.name === "authors");
        expect(authorsRules).toHaveLength(1);
    });
});
