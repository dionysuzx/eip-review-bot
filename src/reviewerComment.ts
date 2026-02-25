export type FileRuleCommentData = {
    min: number;
    requesting: string[];
    mention_reviewers: boolean;
};

function buildRuleKey(
    requesting: string[],
    mention_reviewers: boolean,
): string {
    const mentionMode = mention_reviewers ? "mention" : "no-mention";
    return `${mentionMode}:${requesting.join(",")}`;
}

function formatReviewer(username: string, mention_reviewers: boolean): string {
    return mention_reviewers ? `@${username}` : `\`@${username}\``;
}

function summarizeRules(
    fileRules: FileRuleCommentData[],
): FileRuleCommentData[] {
    const byRule = new Map<string, FileRuleCommentData>();
    for (const rule of fileRules) {
        const requesting = [...rule.requesting].sort();
        const key = buildRuleKey(requesting, rule.mention_reviewers);
        if (byRule.has(key)) {
            continue;
        }
        byRule.set(key, {
            min: rule.min,
            requesting,
            mention_reviewers: rule.mention_reviewers,
        });
    }
    return Array.from(byRule.values());
}

export function generateReviewerComment(
    filesToRules: Record<string, FileRuleCommentData[]>,
): string {
    let comment = "";
    for (const [file, rules] of Object.entries(filesToRules)) {
        comment = `${comment}\n\n### File \`${file}\`\n\n`;
        for (const rule of summarizeRules(rules)) {
            comment = `${comment}Requires ${rule.min} more reviewers from ${rule.requesting
                .map((r) => formatReviewer(r, rule.mention_reviewers))
                .join(", ")}\n`;
        }
    }
    return comment;
}
