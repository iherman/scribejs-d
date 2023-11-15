/**
 * ## JSON Schema validation
 *
 * Validating the configuration and nickname files via JSON Schemas, using the external `Ajv` library.
 *
 * @packageDocumentation
*/


import { parser }       from 'npm:@exodus/schemasafe';
import config_schema    from "./schemas/config_schema.json"    with { type: "json" };
import nicknames_schema from "./schemas/nicknames_schema.json" with { type: "json" };

/**
 *
 * JSON schema validator function for the configuration files, relying on 
 * the JSON Schema file which is part of the distribution.
 * 
 * It is an interface to the JSON Schema processor package `npm:@exodus/schemasafe`.
 * 
 */
export const validate_config = parser(config_schema, {
    mode: "default",
    includeErrors: true,
    allErrors: true,
    requireStringValidation: false
});

/**
 *
 * JSON schema validator function for the nickname mapping files, relying on 
 * the JSON Schema file which is part of the distribution.
 * 
 * It is an interface to the JSON Schema processor package `npm:@exodus/schemasafe`.
 * 
 */
export const validate_nicknames = parser(nicknames_schema, {
    mode: "default",
    includeErrors: true,
    allErrors: true,
    requireStringValidation: false
});
