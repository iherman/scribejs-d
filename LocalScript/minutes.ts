/**
 * ## Layer over scribejs-d, adapted to the situation on my own machine — Deno version
 *
 * @version: 1.0.0
 * @author: Ivan Herman, <ivan@w3.org> (https://www.w3.org/People/Ivan/)
 * @license: W3C Software License <https://www.w3.org/Consortium/Legal/2002/copyright-software-20021231>
 *
 * @packageDocumentation
 */
import { Command } from 'npm:commander@^11.1.0';
import { run }     from "../lib/index.ts";

// The final argument has to be created from a command line containing spaces. Usage of this Fake space
// is to avoid extra splits...
const Fake_Space = "THIS_IS_A_SPACE";
const HOME = '/Users/ivan'


const program = new Command();

/*
 * Get the command line arguments
 */
program
    .usage('[options] [file]')
    .option('-d, --date [date]', 'date of the meeting in ISO (i.e., YYYY-MM-DD) format')
    .option('-g, --group [group_name]', 'groups; values are the respective irc handles')
    .option('-t, --textual', 'Use the Textual log instead of the downloaded one')
    .option('-i, --irccloud', 'Use the IRCCloud log instead of the downloaded one')
    .option('-r, --rdf', 'Use the RDF log instead of the downloaded one')
    .option('-x, --nogh', 'Do not fetch the github issues for the (sub)section titles')
    .option('-z, --topic', 'This is a topic call, add the "topic" suffix to the output file name')
    .option('-s, --special', 'This is a special call, add the "topic" suffix to the output file name')
    .parse(["", "", ...Deno.args]);

const options = program.opts();

/*
    Get the date; that will be used to find the log
*/
const date =  options.date || new Date().toISOString().split('T')[0];
const [year, month, day] = date.split('-');
const iso_date = `${year}-${month}-${day}`;

if (options.group === undefined) {
    console.error('no group id');
    Deno.exit(-1);
}

// Get the 'core' group id to get the right configuration file:

const wg = options.group.split('-')[0];

let command = `-l -c ${HOME}/W3C/github/Tools/scribejs/BrowserView/Groups/configurations/${wg}.json -g ${options.group}`;

const input = ((): string => {
    if (options.textual) {
        // modify command to change the irc log format default
        command = `${command} -i textual`;
        return `${HOME}/Documents/TextualTranscripts/irc.w3.org\\${Fake_Space}\\(F4D29\\)/Channels/\\#${options.group}/${year}-${month}-${day}.txt`;
    } else if (options.irccloud) {
        command = `${command} -i irccloud`;
        return `${HOME}/W3C/WWW/${year}/${month}/${day}-${options.group}.txt`;
    } else if (options.rdf) {
        command = `${command} -i rdf`;
        return `${HOME}/W3C/WWW/${year}/${month}/${day}-${options.group}-irc.rdf`;
    } else {
        return `${HOME}/W3C/WWW/${year}/${month}/${day}-${options.group}-irc.txt`;
    }
})();

if (options.nogh) {
    command = `${command} -x`
}

const output = ((): string => {
    if (options.topic) {
        return `${iso_date}-${options.group}-topic.md`
    } else if (options.special) {
        return `${iso_date}-${options.group}-special.md`
    } else {
        return `${iso_date}-${options.group}.md`
    }
})();

// let output = options.topic ? `${iso_date}-${options.group}-topic.md` : `${iso_date}-${options.group}.md`;

const final_command = `${command} -d ${iso_date} -o ${output} ${input}`;

// The 'command' should be broken down to an argument list that could be used to mimic the
// CLI interface of scribejs-d
const args = final_command.split(' ')
    .filter((entry) => entry !== '')
    .map((entry) => entry.replaceAll(Fake_Space, ' '));

// fake CLI; this is necessary, because the package uses the command npm package
// for CLI parsing, which relies on the first two entries being used by node.js...
const fake_cli = ["","",...args]

await run(fake_cli);
Deno.exit(0);
