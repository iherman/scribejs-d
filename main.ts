#!/usr/bin/env node
/**
 * ## RSSAgent IRC logs Into Minutes in Markdown
 *
 * @version: 2.0.0
 * @author: Ivan Herman, <ivan@w3.org> (https://www.w3.org/People/Ivan/)
 * @license: W3C Software License <https://www.w3.org/Consortium/Legal/2002/copyright-software-20021231>
 *
 * @packageDocumentation
 */

import { ValidationError } from 'npm:@exodus/schemasafe';

import * as io      from './lib/io.ts';
import * as convert from './lib/convert.ts';
import * as conf    from './lib/conf.ts';
import * as schemas from './lib/schemas.ts';
import * as rdf     from './lib/rdf_to_log.ts';
import { Global }   from './lib/types.ts';

/* This is just the overall driver of the script... */

/**
 * Entry point for the package: read the configuration files, get the IRC logs from the command line, convert and output the result in Markdown.
 *
 * The real work is done in the relevant modules, mostly controlled by an instance of a [[Converter]] class.
 */
export async function main(call_args: string[] =["", "", ...Deno.args]) {
    try {
        // Collect and combine the configuration file
        // Note that the get_config method is synchronous
        // (uses a sync version of file system access)
        const config: Global = conf.get_config(call_args);

        // Get the nickname mappings object. The result gets added to the configuration
        // config.nicks is of type Nickname[]
        config.nicks = await io.get_nick_mapping(config);

        // Validate the nickname mapping object against the appropriate JSON schema
        const valid_nick = schemas.validate_nicknames(JSON.stringify(config.nicks));
        if (valid_nick.valid !== true) {
            console.warn(`Warning: scribejs validation error in nicknames:\n`);
            const errors = valid_nick.errors?.map((e: ValidationError): string => {
                return  `Error at "${e.instanceLocation}": ${e.keywordLocation}`;
            })
            if (errors !== undefined ) console.warn(errors.join('\n'));
            console.warn('(nicknames ignored)');
            config.nicks = [];
        }

        // Get the IRC log itself
        let irc_log: string|string[] = await io.get_irc_log(config);

        // If the log is in RDF format of RRSAgent, it is converted to the textual equivalent
        if (config.irc_format === 'rdf') {
            irc_log = await rdf.convert(irc_log);
            delete config.irc_format;
        }

        const minutes: string = await new convert.Converter(config).convert_to_markdown(irc_log);

        const message = await io.output_minutes(minutes, config);

        // That is it, folks!
        console.log(message);
    } catch (err) {
        console.error(`Scribejs: "${err}\n${err.stack}"`);
        Deno.exit(-1);
    }
}

// Do it!
main();
