/**
 * ## JSON Schema validation
 *
 * Validating the configuration and nickname files via JSON Schemas, using the external `Ajv` library.
 *
 * @packageDocumentation
*/


/**
 *
 * Interface to the JSON Schema processor package "exodus". It is used to check
 * the configuration file as well as the nicknames' file.
 *
 * The schemas themselves are part of the distribution as JSON files.
 *
 */

import { parser }  from 'npm:@exodus/schemasafe';

import config_schema    from "./schemas/config_schema.json"    with { type: "json" };
import nicknames_schema from "./schemas/nicknames_schema.json" with { type: "json" };

export const validate_config = parser(config_schema, {
    mode: "default",
    includeErrors: true,
    allErrors: true,
    requireStringValidation: false
});

export const validate_nicknames = parser(nicknames_schema, {
    mode: "default",
    includeErrors: true,
    allErrors: true,
    requireStringValidation: false
});
