// deno-lint-ignore-file require-await no-explicit-any
'use strict';

// eslint-disable-next-line @typescript-eslint/no-var-requires

import { Octokit }                from 'https://esm.sh/octokit?dts';
import { createOrUpdateTextFile } from 'https://esm.sh/@octokit/plugin-create-or-update-text-file';
import { Configuration }          from './types.ts';

interface Repo {
    owner: string,
    repo: string
};


/**
 * Wrapper around a the Github API using the generic octokit library.
 *
 */
export class GitHub {
    private readonly octokit;
    // private readonly owner:   string;
    // private readonly repo:    string;
    private readonly conf: Configuration;
    readonly repo: Repo;

    /**
     * Cache of the issue information structures; using this avoids unnecessary and repeated API calls for issue information
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
     * @param {string} data - data to be uploaded as a separate file
     * @async
     */
    async commit_data(data: string): Promise<string> {
        const path             = `${this.conf.ghpath}/${this.conf.ghfname}`;
        const response = (await this.octokit.createOrUpdateTextFile({
            path: path,
            content: data,
            message: "Created by scribejs",
            branch: this.conf.ghbranch || '',
            ...this.repo
        })).data.html_url;
        return response;
    }

    /**
     * Get the list of issue structures as returned by the github API. Note that this method
     * makes use of the class variable `issues_infos` as a cache.
     *
     * This method takes care of paging to get all the issues.
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
     * @param {string|number} issue_number - Issue number
     * @return - the specific issue structure, or undefined
     * @async
     */
    async get_issue_info(issue_number: string|number): Promise<any | undefined> {
        const infos = await this.get_issues();
        return infos.find((element) => `${element.number}` === `${issue_number}`);
    }

    /**
     * Get the title for a single issue
     *
     * @param {string|number} issue_number - Issue number
     * @return {string} - title of the issue, or empty string if issue number is invalid
     * @async
     */
    async get_issue_title(issue_number: string|number): Promise<string> {
        try {
            const info = await this.get_issue_info(issue_number);
            return info.title
        } catch (e) {
            return "";
        }
    }

    /**
     * Get the list of assignees' logins. The method takes care of paging.
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
     * @param {Object} issue - issue structure (see the Github API for details)
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



