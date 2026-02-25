export type FileRuleCommentData = {
    min: number;
    requesting: string[];
    mention_reviewers: boolean;
};

export function generateReviewerComment(
    filesToRules: Record<string, FileRuleCommentData[]>,
): string {
    let comment = "";
    for (const [file, rules] of Object.entries(filesToRules)) {
        comment = `${comment}\n\n### File \`${file}\`\n\n`;
        const seen = new Map<string, FileRuleCommentData>();
        for (const rule of rules) {
            const key = [...rule.requesting].sort().join(",");
            const existing = seen.get(key);
            if (existing) {
                existing.mention_reviewers =
                    existing.mention_reviewers || rule.mention_reviewers;
            } else {
                seen.set(key, {
                    min: rule.min,
                    requesting: [...rule.requesting].sort(),
                    mention_reviewers: rule.mention_reviewers,
                });
            }
        }
        for (const rule of seen.values()) {
            comment = `${comment}Requires ${rule.min} more reviewers from ${rule.requesting
                .map((r) => rule.mention_reviewers ? `@${r}` : `\`@${r}\``)
                .join(", ")}\n`;
        }
    }
    return comment;
}
