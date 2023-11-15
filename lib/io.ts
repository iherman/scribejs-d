// deno-lint-ignore-file require-await
/**
 *
 * Collection of methods to perform, essentially I/O operations. These include:
 *
 * * Get the IRC log itself
 * * Get the nickname file
 * * Dump the generated minutes into a file or upload it to github.
 *
 *
 * @packageDocumentation
 */

import * as url                                          from 'node:url';
// @deno-types="npm:@types/valid-url" 
import * as validUrl                                     from 'npm:valid-url@^1.0.9';
import { GitHub }                                        from './github_api.ts';
import { Configuration, PersonWithNickname, Constants }  from './types.ts';


/**
 * Get a text file.
 *
 * The input provided in the configuration is examined whether
 * it is a URL (in which case this is retrieved via HTTP) or not (in which case
 * it is considered to be a local file to be read). Returns a Promise with the content
 * of the input as single string.
 *
 * @param input - URL or file name
 * @returns a promise containing the text content as a single string.
 * @async
 */
export async function fetch_text(input: string): Promise<string> {

    if (url.parse(input).protocol !== null) {
        const response = await fetch(input);
        if (response.ok) {
            const returned_content_type = response.headers.get('content-type');
            if (returned_content_type === null) {
                throw new Error(`No content type is returned for the IRC log`);
            } else {
                const content_type = returned_content_type.split(';')[0];
                if (Constants.text_media_types.includes(content_type)) {
                    return response.text();
                } else {
                    throw new Error(`IRC log must be of type text/plain, it is ${content_type}`);
                }
            }
        } else {
            throw new Error(`HTTP response ${response.status}: ${response.statusText} on ${input}`);
        }
    } else {
        return Deno.readTextFile(input);
    }
}

/**
 * Get the IRC log. The input reference provided in the configuration (i.e., `conf.input`) is examined 
 * whether it is a URL (in which case this is retrieved via HTTP) or not (in which case
 * it is considered to be a local file). Returns a Promise with the content
 * of the input as single string.
 *
 * @param conf - overall configuration; the only field that matters here is `conf.input`.
 * @returns a promise containing the irc log as a single string.
 * @async
 */
export async function get_irc_log(conf: Configuration): Promise<string> {
    if (conf.irclog) {
        // This field may be present if called from a CGI script, and the IRC log
        // is uploaded
        return conf.irclog
    } else {
        return conf.input === undefined ? "" : fetch_text(conf.input);
    }
}

/**
* Basic sanity check on the URL.
*
* The function returns a (possibly slightly modified) version of the URL if
* everything is fine, or a null value if the input argument is not a URL (but
* should be used as a filename).
*
* There might be errors, however, in the case it is a URL. In such cases the
* function raises an exception; this should be caught to end all processing.
*
* The checks are as follows:
*
* 1. Check whether the protocol is http(s). Other protocols are not accepted (actually rejected by fetch, too)
* 2. Run the URL through a valid-url check, which looks at the validity of the URL in terms of characters used, for example
* 3. Check that the port (if specified) is in the allowed range, ie, > 1024
* 4. Don't allow localhost in a CGI answer...
*
* @param address: the URL to be checked.
* @return the URL itself (which might be slightly improved by the
*     valid-url method) or null if this is, in fact, not a URL
* @throws if it pretends to be a URL, but it is not acceptable for some reasons.
*/
function url_sanity_check(address: string): string | null {
    const parsed = url.parse(address);
    if (parsed.protocol === null) {
        // This is not a URL, should be used as a file name
        return null;
    }
    // Check whether we use the right protocol
    if (['http:', 'https:'].includes(parsed.protocol) === false) {
        throw new Error(`Only http(s) url-s are accepted (${address})`);
    }

    // Run through the URL validator
    const retval = validUrl.isWebUri(address);
    if (retval === undefined) {
        throw new Error(`The url ${address} isn't valid`);
    }

    // Check the port
    if (parsed.port !== null && Number.parseInt(parsed.port, 10) <= 1024) {
        throw new Error(`Unsafe port number used in ${address} (${parsed.port})`);
    }

    // Don't allow local host in a CGI script...
    // (In Bratt's python script (<http://dev.w3.org/2004/PythonLib-IH/checkremote.py>) this step was much
    // more complex, and has not yet been reproduced here...
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        throw new Error(`Localhost is not accepted in ${address}`);
    }

    // If we got this far, this is a proper URL, ready to be used.
    return retval;
}

/**
 * Get the nickname mapping file (if any). The input provided in the
 * configuration is examined whether it is a URL (in which case this is
 * retrieved via HTTP) or not (in which case it is considered to be a local file).
 * Returns a Promise with the content of the input as an object.
 *
 * @param conf - Overall configuration; the only field that matter here is `conf.nicknames`
 * @returns - a promise containing the nicknames as an object parsed from JSON.
 * @async
 */
export async function get_nick_mapping(conf: Configuration): Promise<PersonWithNickname[]> {
    /**
    * Minimal cleanup on nicknames: allow irc log to be lower or upper case,
    * internal comparisons should use the lower case only
    */
    const lower_nicks = (nicks: PersonWithNickname[]): PersonWithNickname[] => {
        return nicks.map((nick_structure: PersonWithNickname): PersonWithNickname => {
            const lowered = nick_structure.nick.map((nick: string): string => nick.toLowerCase());
            nick_structure.nick = lowered;
            return nick_structure;
        });
    };

    if (conf.nicknames) {
        const address = url_sanity_check(conf.nicknames);
        if (address !== null) {
            const response = await fetch(address);
            if (response.ok) {
                const nicks = await response.json() as PersonWithNickname[];
                return lower_nicks(nicks);
            } else {
                throw new Error(`HTTP response ${response.status}: ${response.statusText}`);
            }
        } else {
            const nicks = await Deno.readTextFile(conf.nicknames);
            try {
                const json_content = JSON.parse(nicks) as PersonWithNickname[];
                return lower_nicks(json_content)
            } catch (e) {
                throw new Error(`JSON parsing error in ${conf.nicknames}: ${e}`)
            }
        }
    } else {
        return [];
    }
}

/**
 * Committing new markdown file on the github repo.
 *
 * The following terms in the configuration are relevant for this function:
 * - `ghrepo`: the full name of the repository. E.g., "w3c/scribejs"
 * - `ghpath`: the path within the repository where the data must be stored. E.g., "test/minutes"
 * - `ghfname`: the file name
 * - `ghtoken`: the user's OAUTH personal access token provided by GitHub (see https://github.com/settings/tokens/new)
 * - `ghbranch`: the target branch within the repository. This term may be missing from the configuration, in which case the default branch of the repo is used
 *
 * The real work is done in the [GitHub](./GitHub.html) interface to the Github API.
 *
 * @param data - the markdown file to be uploaded.
 * @param conf - the configuration containing the necessary data for upload.
 * @returns the returned promise data from the GitHub API; its only use is for possible debug.
 * @async
 */
// deno-lint-ignore no-explicit-any
async function commit(data: string, conf: Configuration): Promise<any> {
    if (conf.ghrepo === undefined) {
        throw new Error(`Attempt to commit without a valid gh repository nae`)
    } else {
        const gh = new GitHub(conf.ghrepo, conf);
        return gh.commit_data(data);
    }
}

/**
 * Output the minutes. Depending on the configuration, the values are stored in a file or on
 * a GitHub repository.
 *
 * @param  minutes - the markdown data to be uploaded.
 * @param conf - the configuration containing additional data.
 * @returns - the returned promise data with the file name or URL of the generated minutes (for debug purposes).
 * @async
 */
export async function output_minutes(minutes: string, conf: Configuration): Promise<string> {
    if (conf.torepo) {
        try {
            const retval = await commit(minutes, conf);
            return retval;
        } catch (e) {
            throw new Error(`Problem writing repository ${conf.torepo}; ${e}`);
        }
    } else if (conf.output) {
        try {
            await Deno.writeTextFile(conf.output, minutes);
            return conf.output;
        } catch (e) {
            throw new Error(`Problem writing local file ${conf.output}; ${e}`)
        }
    } else {
        console.log(minutes);
        return '';
    }
}
