import processFiles from "../process.js";
import { Config, File, Octokit, Rule } from "../types.js";
import github from "@actions/github";

export default async function (
    octokit: Octokit,
    config: Config,
    files: File[],
): Promise<Rule[]> {
    // Get results
    const res: Rule[][] = await Promise.all(
        files.map(async (file) => {
            let filename = "";
            if (
                file.filename.startsWith("assets/eip-") &&
                !files.some(
                    (f) =>
                        f.filename == `EIPS/${file.filename.split("/")[1]}.md`,
                )
            ) {
                filename = `EIPS/${file.filename.split("/")[1]}.md`;
            } else if (
                file.filename.startsWith("assets/erc-") &&
                !files.some(
                    (f) =>
                        f.filename == `ERCS/${file.filename.split("/")[1]}.md`,
                )
            ) {
                filename = `ERCS/${file.filename.split("/")[1]}.md`;
            }
            if (filename == "") {
                return []; // Not an asset file
            }
            if (files.some((file) => file.filename == filename)) {
                return []; // Already covered by the relevant rules, so avoid potential conflicts by short circuiting
            }
            let contents: string | undefined;
            try {
                contents = (
                    await octokit.rest.repos.getContent({
                        ...github.context.repo,
                        path: filename,
                        mediaType: { format: "raw" },
                    })
                ).data as unknown as string;
            } catch (e) {
                if (!(e instanceof Object && "status" in e && e.status === 404))
                    throw e;
            }

            return processFiles(octokit, config, [
                {
                    filename,
                    status: "modified",
                    contents,
                    previous_contents: contents,
                },
            ]);
        }),
    );

    // Merge results
    const ret: Rule[] = [];
    res.forEach((val) => ret.push(...val));
    return ret;
}
