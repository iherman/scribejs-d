// deno-lint-ignore-file no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-var-requires

import { Octokit }                from "https://esm.sh/octokit@3.1.1?dts";
import { createOrUpdateTextFile } from "https://esm.sh/@octokit/plugin-create-or-update-text-file@4.0.1";
import { Configuration }          from './types.ts';

/**
 * Wrapper around a the Github API using the generic [octokit library](https://github.com/octokit/octokit.js).
 * It only includes shortcut methods for what is used in the package.
 * 
 * Note that for [uploading content to a repository](#method_commit_data_0), a separate 
 * [plugin to the octokit library](https://github.com/octokit/plugin-create-or-update-text-file.js) is also used.
 *
 */
export class GitHub {
    private readonly octokit;
     private readonly conf: Configuration;
    readonly repo: {owner: string, repo: string};

    /**
     * Cache of the issue information structures; using this avoids unnecessary and repeated API calls for issue information.
     * At first call to the [`get_issues`](#method_get_issues_0) downloads and stores the information on issues locally, and
     * is reused in subsequent calls. This avoids unnecessary and repeated HTTPS access to the real repository.
     */
    private issue_infos: any[] = [];

    /**
     *
     * @param {string} repo_id - Github repo identifier in a `owner/repo` format
     * @param {Object} conf - program configuration
     */
    constructor(repo_id: string, conf: Configuration) {
        const myOctokit = Octokit.plugin(createOrUpdateTextFile);
        this.octokit             = new myOctokit({ auth: conf.ghtoken });
        this.conf                = conf;
        const [owner, repo] = repo_id.split('/');
        this.repo = {owner, repo}
    }

    /**
     * Create a new (markdown) entry on the repository.
     * 
     * This methods uses the 
     *
     * @param {any} data - data returned from GitHub API (usable for debug);
     * @async
     */
    async commit_data(data: string): Promise<any> {
        const path             = `${this.conf.ghpath}/${this.conf.ghfname}`;
        const response = (await this.octokit.createOrUpdateTextFile({
            path: path,
            content: data,
            message: "Created by scribejs",
            branch: this.conf.ghbranch || '',
            ...this.repo
        }));
        if (response) {
            return response
        } else {
            return {};
        }
    }

    /**
     * Get the list of issue structures as returned by the github API. Note that this method
     * makes use of the class variable [`issues_infos`](#property_issue_infos) as a cache.
     *
     * The method takes care of paging to get all the (open) issues and PRs.
     *
     * @returns - array of objects
     * @async
     */
    async get_issues(): Promise<any[]> {
        if (this.issue_infos.length === 0) {
            this.issue_infos = await this.octokit.paginate(this.octokit.rest.issues.listForRepo, {
                per_page : 100,
                ...this.repo
            });
        };
        return this.issue_infos;
    }

    /**
     * Get the list of issue titles.
     *
     * @return - array of issue titles
     * @async
     */
    async get_issue_titles(): Promise<string[]> {
        const retval = await this.get_issues();
        return retval.map((issue) => issue.title);
    }

    /**
     * Get the data for a single issue
     * 
     * @param issue_number - issue number
     * @return - the specific issue structure, or undefined
     * @async
     */
    async get_issue_info(issue_number: string|number): Promise<any | undefined> {
        const infos = await this.get_issues();
        return infos.find((element) => `${element.number}` === `${issue_number}`);
    }

    /**
     * Get the title for a single issue.
     *
     * @param issue_number - issue number
     * @return - title of the issue, or empty string if issue number is invalid
     * @async
     */
    async get_issue_title(issue_number: string|number): Promise<string> {
        try {
            const info = await this.get_issue_info(issue_number);
            return info.title
        } catch (_e) {
            return "";
        }
    }

    /**
     * Get the list of assignees' GitHub IDs. The method takes care of paging.
     *
     * @return - list of github login names for the assignees
     * @async
     */
    async get_assignees(): Promise<string[]> {
        const collaborators = (await this.octokit.paginate(this.octokit.rest.repos.listCollaborators, {
            per_page: 100,
            ...this.repo
        })).map((entry): string => entry.login);
        return collaborators;
    }

    /**
     * Create a new issue.
     * 
     * (Currently unused.)
     *
     * @param issue - issue structure (see the Github API for details)
     * @async
     */
    async create_issue(issue: any): Promise<void> {
        await this.octokit.rest.issues.create({
            title: issue.issue_title,
            body: issue.issue_body,
            ...this.repo
        });
    }
}



