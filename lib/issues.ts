/**
 *
 * Handling the issue directives
 *
 * @packageDocumentation
 */

import { zip, GitHubCache }                         from './utils.ts';
import { Configuration, IssueReference, Constants } from './types.ts';
import { GitHub }                                   from './github_api.ts';


/**
 * Convert any line that contains exclusively a URL to a GitHub issue/PR into a scribejs directive on issues.
 * Similarly, if the line is a topic setting line, and the only entry for the section title is an
 * issue/PR URL, the title is modified accordingly.
 *
 * @param the_line
 * @returns
 */
export function url_to_issue_directive(the_line: string): string {
    const get_issue_reference = (line: string): string => {
        // to be on the safe side, trim the line before attempting to match
        const match: RegExpMatchArray | null = line.trim().match(Constants.issue_pr_url_regexp);
        if (match) {
            const repo: string = match[Constants.ip_repo_index];
            const issue_type: string = match[Constants.ip_type];
            const issue: string = match[Constants.ip_issue];
            return `${issue_type === 'issues' ? 'issue' : 'pr'} ${repo}#${issue}`;
        } else {
            return line;
        }
    }

    // If the line begins with (sub)topic, it should be treated differently
    if (the_line.toLowerCase().startsWith('topic:') || the_line.toLowerCase().startsWith('subtopic:')) {
        // The extra filter is necessary to remove the effect of a double space
        const words: string[] = the_line.split(' ').filter((l) => l !== '');
        // if there are more than two words, no change
        if (words.length > 2) {
            return the_line;
        } else if (words.length === 1) {
            console.log(`Missing topic content in ${the_line} (forgot a space?)`);
            return the_line;
        } else {
            // Now we can check whether this is an issue URL
            const is_issue = get_issue_reference(words[1]);
            if (is_issue === words[1]) {
                // This was not an issue reference
                return the_line
            } else {
                return `${words[0]} @${is_issue}`
            }
        }
    } else {
        // Just consider the full line as a go
        const is_issue = get_issue_reference(the_line);
        if (is_issue === the_line) {
            // This was not an issue reference
            return the_line
        } else {
            return `scribejs, ${is_issue}`;
        }
    }
}

/**
 * Information on an issue
 */
export interface IssueInformation {
    /** Standard markdown line listing the issue URL */
    text: string;
    /** 
     * If Jekyll is used, a comment with the list of URL-s in the form of `<!-- issue URL_X,URL_Y,URL_Z -->`. This may be used
     * as a post-processing step to add text as a comment to an issue
     */
    ids?: string[];
}

/**
 * Handling the `scribejs, issue X,Y,Z` type directives. The method returns a set of strings to be added to the
 * final (markdown) minutes. 
 *
 * While the comments are invisible when displayed as part of the minutes, they may be used by postprocessing tools that
 * gathers a portion of the discussions that is relevant to a particular issue or set of issues.
 *
 * If the original directive just includes a `-` instead of the issue numbers a special HTML/markdown comment returned of the form `<!-- issue - -->`. This
 * may be used as a "closing" part by a post-processing step to cut off the text in the rest of a (sub)section from being an issue comment.
 *
 * @param config - the general scribejs configuration object
 * @param directive - either 'pr' or 'issue'
 * @param issue_references - comma separated list of issue numbers, possibly of the form `repo#number`
 * @returns the markdown lines to be added to the final minutes
 */
export function issue_directives(config: Configuration, directive: string, issue_references: string): IssueInformation {
    // see if there is an issue repository to use:
    const repo = config.issuerepo || config.ghrepo;

    if (repo === undefined) {
        return { text: '' };
    } else {
        // Previous steps may add a '.' to the end of a line; this is removed here to be on the safe side:
        let final_issue_references = issue_references.trim();
        if (final_issue_references.endsWith('.')) {
            final_issue_references = final_issue_references.slice(0,-1);
        }

        // No exception should disrupt the flow of the minutes generation; the directive is then simply discarded.
        try {
            // This information is necessary if the issue is not bound to the default repository.
            const organization = repo.split('/')[0];

            // Some details are different whether we are talking about PR-s or issues: the exact URL and the text to be added to the response
            const peel_issue_pr = (val: string) => {
                if (val === 'pr') {
                    return {
                        issue_or_pr : 'pull request',
                        url_part    : 'pull',
                    };
                } else {
                    return {
                        issue_or_pr : 'issue',
                        url_part    : 'issues',
                    };
                }
            };
            const { issue_or_pr, url_part } = peel_issue_pr(directive);

            // Separate the 'closing' directive
            if (url_part.startsWith('-')) {
                // This is to stop the effect of the issue discussion
                if (config.jekyll !== 'none') {
                    return {text: '\n\n<!-- issue - -->\n\n'};
                } else {
                    return {text: ''};
                }
            } else {
                const issue_numbers: string[] = final_issue_references.split(',').map((str) => str.trim());
                // By default, the numbers are just numbers for the default issue repository, but the
                // user is entitled to give a repo#number, and the URL must be separated.
                // Note that, at this moment, the organization remains the same, the tooling is not prepared for the case
                // when the group is handling several organizational repositories at the same time... The default group
                // repository's organization wins.

                // List of the final issue URL-s
                const urls: string[] = issue_numbers.map((num) => {
                    if (num.includes('#')) {
                        const parts = num.split('#');
                        return `https://github.com/${organization}/${parts[0]}/${url_part}/${parts[1]}`;
                    } else {
                        return `https://github.com/${repo}/${url_part}/${num}`;
                    }
                });

                const issue_ids: string[] = issue_numbers.map((num) => {
                    if (num.includes('#')) {
                        const parts = num.split('#');
                        return `${organization}/${parts[0]}/${parts[1]}`;
                    } else {
                        return `${repo}/${num}`;
                    }
                });

                // Generation of the (visible) markdown entries
                const all_issues: string = zip(issue_numbers, urls)
                    .map((num_url: [string,string]): string => {
                        const prefix = num_url[0].includes('#') ? '' : '#';
                        return `[${prefix}${num_url[0]}](${num_url[1]})`;
                    })
                    .join(', ');

                const md_part =  `_See github ${issue_or_pr} ${all_issues}._`;
                const md_comment = `<!-- issue ${issue_ids.join(' ')} -->`;

                return {
                    text : `\n\n${md_part}\n\n${md_comment}\n\n`,
                    ids  : issue_ids,
                }
            }
        } catch (e) {
            // No exception should disrupt the flow of the minutes generation; the directive is then simply discarded.
            return {text: ''};
        }
    }
}

/**
 * Handling a (sub)topic line: find, if present, a `@issue XX,YY,ZZ` line and process it as in [`issue_directives`](./issue_directives.html) leaving the rest of content as the
 * real (sub)topic line.
 *
 * @param config - the general scribejs configuration object
 * @param content - the content of the full title line
 * @return {object} - object with `title_text` set to the title line content (issue number if missing)
 * and `issue_reference` to the list of issues to display (empty string if missing)
 */
export async function titles(config: Configuration, content: string): Promise<IssueReference> {
    // Get the final title. If there is none, but there is an issue/or reference, the title is
    // picked up by using the github api
    const get_final_title = async (title: string, issue_information: IssueInformation, directive: string): Promise<string> => {
        if (title) {
            return title;
        } else if (issue_information.ids && issue_information.ids.length > 0) {
            const [organization, repo, issue] = issue_information.ids[0].split('/');
            try {
                const gh: GitHub = GitHubCache.gh(`${organization}/${repo}`,config);
                const i_title = await gh.get_issue_title(issue);
                return `${i_title} (${directive} ${repo}#${issue})`;
            } catch (_e) {
                return '';
            }
        } else {
            return '';
        }
    };

    // Extract the title and the issue/pr values if present. Returns an empty string if there are no issues
    const get_values = async (directive: string): Promise<IssueReference|null> => {
        if (content.includes(`@${directive}`)) {
            const [title, issue] = content.split(`@${directive}`);
            const issue_information = issue_directives(config, directive, issue);
            // If there is no title, only the reference to an issue/pr, the title of that issue is picked up from github and used here.
            const final_title = await get_final_title(title, issue_information, directive);
            return {
                title_text      : final_title || issue,
                issue_reference : issue_information.text,
            };
        } else {
            return null;
        }
    };

    // const check_issues: (IssueReference|null)[] = await Promise.all([get_values('issue'), get_values('issues'), get_values('pr')]);
    // const final_issue = check_issues.filter((entry) => entry !== null);
    const final_issue = (await Promise.all([
        get_values('issue'), 
        get_values('issues'), 
        get_values('pr')])
    ).filter((entry) => entry !== null);
    return (final_issue.length === 0 || final_issue[0] === null) ? { title_text: content, issue_reference: '' } : final_issue[0];
}
