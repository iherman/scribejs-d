// deno-lint-ignore-file no-namespace
/* eslint-disable no-multi-spaces */
/**
 * ## Common types and constants
 *
 * @packageDocumentation
*/

import { Actions }  from './actions.ts';

// export const debug = false;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Constants {
    /** No Jekyll is used on the result, result must be standard markdown. Value used in the configuration. */
    export const JEKYLL_NONE        = 'none';
    /** Jekyll is used with standard markdown. Value used in the configuration. */
    export const JEKYLL_MARKDOWN    = 'md';
    /** Jekyll is used with kramdown. Value used in the configuration. */
    export const JEKYLL_KRAMDOWN    = 'kd';

    /** Number of characters added to each line by RRSAgent. */
    export const rrsagent_preamble_size = 8 + 1;
    // const rrsagent_regexp = /^[0-9]{2}:[0-9]{2}:[0-9]{2}/;

    /** Number of characters added to each line by IRCCloud. */
    export const irccloud_preamble_size = 1 + 10 + 1 + 8 + 1 + 1;
    /** Regex to filter out the preamble of each line in IRCCloud */
    export const irccloud_regexp = /^\[[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\]/;

    /** Number of characters added to each line by Textual. */
    export const textual_preamble_size  = 1 + 10 + 1 + 8 + 1 + 4 + 1 + 1;
    /** Regex to filter out the preamble of each line in Textual */
    export const textual_regexp  = /^\[[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+[0-9]{4}\]/;

    /** Regex to localize an issue setting scribejs directive */
    export const issue_regexp    = /^@?(scribejs|sjs),\s+(issue|pr)\s+(.*)$/;

    /** Regex to localize an agenda item added bu the bot */
    export const agenda_regexp   = /.* \-\- (.*) \-\-.*/;

    /** Name of the user configuration file. */
    export const user_config_name = '.scribejs.json';
    /** Name of the user GitHub credential file. */
    export const user_ghid_file   = '.credentials.json';

    /** Text based media types recognized by scribejs. */
    export const text_media_types = [
        'text/plain',
        'application/rdf+xml',
        'application/json',
    ];

    /** URL Protocols that are accepted as valid links in the minutes (and are turned into real links). */
    export const protocols = ['http:', 'https:', 'ftp:', 'mailto:', 'doi:', 'did:'];

    /** Identify and parse a github issue/pr URL, and indexes into the regexp result to extract specific data */
    export const issue_pr_url_regexp = /^(http)([s]*):\/\/github.com\/[-+a-z0-9_.]+\/([-+a-z0-9_.]+)\/(issues|pull)\/([0-9]+)$/i;
    export const ip_repo_index = 3;
    export const ip_type = 4;
    export const ip_issue = 5;

    // Constants to handle slide sets
    export const i_slide_code = '<script type="module" src="https://w3c.github.io/i-slide/i-slide-1.js"></script>';
    export const i_slide_reference = '<a href="$1#$2"><i-slide src="$3#$4" style="border: 1px solid"></i-slide></a>';
    export const slide_regexp = /\[[sS]lide #*([0-9]+)\]/;
    export const slide_number_index = 1;
}


/**
 * All the configuration variables that can also appear in configuration files.
 *
 */
export interface Configuration {
    /** Date in ISO format. */
    date?:          string;

    /** Group name, ie, IRC channel without the staring # or & character. */
    group?:         string;

    /** IRC log; a file name or a URL. */
    input?:         string;

    /** Output file name */
    output?:        string;

    /** Nickname log; a JSON file name or a URL. */
    nicknames?:     string;

    /** Whether he minutes are final, i.e., they won't be labeled as 'DRAFT'. */
    final?:         boolean;

    /** Whether the draft label is to be generated automatically into the minutes via a separate script. */
    auto?:          boolean;

    /** Whether the output should be stored in a github repository. */
    torepo?:        boolean;

    /** Whether the output is meant to be converted further by pandoc. */
    pandoc?:        boolean;

    /** Whether the output should be adapted to a Github+Jekyll combination. Values may be 'none', 'md', or 'kd'. */
    jekyll?:        string;

    /** Whether the output front matter should also include the schema.org metadata in schema.org. */
    schema?:        boolean;

    /**
     * Whether the input is of the log format of a particular IRC client.
     *
     * If missing, the format is the RRSAgent output @W3C. 'textual' and IRCCloud are only other client format implemented so far.
     * Additionally, the value can also be set to 'rdf' on the command line; however, the main entry points catches that
     * value to convert the log to text and then unsets the value. I.e., the 'rdf' value is not visible to the bulk of the
     * code.
     */
    irc_format?:    string;

    /** Github repo name. */
    ghrepo?:        string;

    /** Github path for the upload of the minutes. */
    ghpath?:        string;

    /** Branch of the repository where the minutes should be stored. If not set, default is used. */
    ghbranch?:      string;

    /** Github repo name for action issues. */
    acrepo?:        string;

    /** (Default) github repo for the issues that are discussed on the call. */
    issuerepo?:     string;

    /** URL pattern used to refer the minutes. */
    acurlpattern?:  string;

    /** Github user's login name. */
    ghname?:        string;

    /** Github user's email address. */
    ghemail?:       string;

    /**
     * User's OAUTH personal access token for GitHub.
     *
     * This value should ***NOT*** appear in any public configuration file or in the code!
     */
    ghtoken?:       string;

    /**
     * File name to be used if the script uploads the minutes directly to GitHub. Defaults to the
     * output setting of the user.
     */
    ghfname?:       string;

    /**
     * IRC log contained in the structure verbatim; this is when the script runs on the client side
     */
    irclog?:        string;
}

/**
 * Global data, which includes the data in the [Configuration](./Configuration.html) but also variables that are set by the process run-time
 */
export interface Global extends Configuration {
    /**
     * Message to be used if the script uploads the minutes directly to Github. This is a fixed text
     * at the moment, generated with the right date and generation time.
     */
    ghmessage?:       string;

    /**
     * Original URL for the IRC log, stored run-time.
     */
    orig_irc_log?:    string;

    /**
     * List of actions, collected while the conversion is done.
     */
    action_list?:     Actions;

    /**
     * List of resolutions, collected while the conversion is done.
     */
    resolution_list?: Resolution[];


    /**
     * List of all the nicknames as retrieved from the nickname file.
     *
     * Note: this variable is set run-time, not via the configuration file.
     */
    nicks?:           PersonWithNickname[];

    /**
     * Mapping from names to a Nickname structure.
     */
    nick_mappings?:   NicknameMapping;

    /**
     * URL of the (current) slideset
     */
    slideset?:        string;
}


export interface Person {
    /** The full name */
    name: string;

    /**
     * Github ID of the person.
     *
     * Currently not really used, could be used later to add links to the minutes.
     */
    github?:    string;

    /** Particular role of the person: chair, staff contact, editor. (Currently not used, maybe in a future version) */
    role?:      string;

    /** URL of the person (currently not used, maybe in a future version) */
    url?:       string;
}

/**
 * Structure of a nickname, as provided in the separate list by the users; it is the Person plus the
 * possible nicknames.
 */
export interface PersonWithNickname extends Person {
    /** List of possible nicknames. */
    nick:       string[];
}

/**
 * "Inverse" key structure: looking up a specific nickname
 */
export interface NicknameMapping {
    [index: string]: Person;
}

/**
 * Structure generated for the "header" items in the final minutes (title, agenda, participants, etc.).
 */
export interface Header {
    /** Title of the meeting. */
    meeting:    string;

    /** URL of the agenda. */
    agenda:     string;

    /** Date of the meeting. */
    date:       string;

    /** Names of chairs. */
    chair:      string[];

    /** Names of all present. */
    present:    string[];

    /** Names of persons having sent regrets. */
    regrets:    string[];

    /** Names of guests. */
    guests:     string[];

    /** Names of scribes. */
    scribe:     string[];

    /** Allow to access things by indexing via a string. */
    [index: string]: any;
}

/**
 * Essential content of an IRC log line
 */
export interface LineObject {
    /** IRC nick. */
    nick: string;

    /** The content of the line. */
    content: string;

    /** The content of the line all in lower case (used for possible comparisons). */
    content_lower?: string;
}

/**
 * Used when the issue reference is combined with a (sub)topic setting.
 */
export interface IssueReference {
    /** The bare title text, without the issue references. */
    title_text: string;

    /** The issue reference directives to be added the final minutes. */
    issue_reference: string;
}

/**
 * Used to structure the resolution data stored in the JSON-LD header
 */
export interface Resolution {
    /** The number of the resolution. */
    resolution_number: number;

    /** The text of the resolution. */
    resolution_text: string;
}
