/**
 * ## Real entry point into the package
 *
 * @version: 1.0.0
 * @author: Ivan Herman, <ivan@w3.org> (https://www.w3.org/People/Ivan/)
 * @license: W3C Software License <https://www.w3.org/Consortium/Legal/2002/copyright-software-20021231>
 *
 * @packageDocumentation
 */

import { ValidationError } from 'npm:@exodus/schemasafe';

import * as io      from './io.ts';
import * as convert from './convert.ts';
import * as conf    from './conf.ts';
import * as schemas from './schemas.ts';
import * as rdf     from './rdf_to_log.ts';
import { Global }   from './types.ts';

/* This is just the overall driver of the script... */

/**
 * Entry point for the package: read the configuration files, get the IRC logs from the command line, convert and output the result in Markdown.
 * The real work is done in the relevant modules, controlled by a single instance of a [Converter](./Converter.html) class.
 * 
 * 
 * This function may serve as the entry point for a "main" that provides the CLI arguments, or any layer on top of the library that
 * produces an environment specific arguments.
 *  
 * @param cli_args - The `cli_args` parameter contains the array of CLI arguments. Beware: the array ***must*** begin with two empty strings (followed, e.g., by `Deno.args()`). The reason
 * is that the library uses the `npm:commander` module, which is prepared for the `node.js` argument list (which includes two entries _before_ the "real" arguments).
 */
export async function run(cli_args: string[]) {
    try {
        // Collect and combine the configuration file
        // Note that the get_config method is synchronous
        // (uses a sync version of file system access)
        const config: Global = conf.get_config(cli_args);

        // Get the nickname mappings object. The result gets added to the configuration
        // config.nicks is of type Nickname[]
        config.nicks = await io.get_nick_mapping(config);

        // Validate the nickname mapping object against the appropriate JSON schema
        const valid_nick = schemas.validate_nicknames(JSON.stringify(config.nicks));
        if (valid_nick.valid !== true) {
            console.warn(`Warning: scribejs validation error in nicknames:\n`);
            const errors = valid_nick.errors?.map((e: ValidationError): string => {
                return `Error at "${e.instanceLocation}": ${e.keywordLocation}`;
            });
            if (errors !== undefined) console.warn(errors.join('\n'));
            console.warn('(nicknames ignored)');
            config.nicks = [];
        }

        // Get the IRC log itself
        let irc_log: string | string[] = await io.get_irc_log(config);

        // If the log is in RDF format of RRSAgent, it is converted to the textual equivalent
        if (config.irc_format === 'rdf') {
            irc_log = await rdf.convert_rdf(irc_log);
            delete config.irc_format;
        }

        const minutes: string = await new convert.Converter(config).convert_to_markdown(irc_log);

        const _message = await io.output_minutes(minutes, config);

        // That is it, folks!
    } catch (err) {
        console.error(`Scribejs: "${err}\n${err.stack}"`);
        Deno.exit(-1);
    }
}
