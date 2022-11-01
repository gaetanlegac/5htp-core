/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { v4 as uuid } from 'uuid';

// Core
import app, { $ } from '@server/app';
import type { Console } from '.';

// Types
import type ServerRequest from '@server/services/router/request';

/*----------------------------------
- TYPES
----------------------------------*/

type AppBugInfos = { 
    user: string, 
    ip: string, 
    device: string, 

    client: string, 
    build: string, 

    status: string, 
    side: 'gui' | 'daemon',
    action: string,
    message: string,
    stacktrace: string,
}

/*----------------------------------
- CONFIG
----------------------------------*/

const errorMailInterval = (1 * 60 * 60 * 1000); // 1 hour

/*----------------------------------
- SERVICE
----------------------------------*/
export default class BugReporter {

    // Bug ID => Timestamp latest send
    private sentBugs: {[bugId: string]: number} = {};

    public constructor(
        private console: Console
    ) {

    }

    private shouldSendReport( 
        side: string, 
        user: string | undefined, 
        action: string | undefined, 
        message: string 
    ) {
        const bugId = [side, user, action, message].filter(e => !!e).join('::');
        const lastSending = this.sentBugs[bugId];
        this.sentBugs[bugId] = Date.now();
        return lastSending === undefined || lastSending < Date.now() - errorMailInterval;
    }

    public async client() {
        
    }

    public async server( error: Error, request?: ServerRequest ) {

        // error should be printed in the console, so they're acccessible from logs
        console.error(`Sending bug report for the following error:`, error);

        // Prevent duplicates
        if (!this.shouldSendReport('server', request?.user?.name, undefined, error.message))
            return;

        // Get context
        const now = new Date();
        const hash = uuid();
        const { channelType, channelId } = this.console.getChannel();

        // On envoi l'email avant l'insertion dans bla bdd
        // Car cette denrière a plus de chances de provoquer une erreur
        const logsHtml = this.console.printHtml(
            this.console.logs.filter(e => e.channelId === channelId), 
            true
        );

        // Send notification
        if (app.isLoaded('email'))
            $.email.send({
                to: app.identity.author.email,
                subject: "Server bug: " + error.message,
                html: `
                    <a href="${app.env.url}/admin/activity/requests/${channelId}">
                        View Request details & console
                    </a>
                    <br/>
                    ${logsHtml}
                `
            });
        else
            console.error("Unable to send bug report: email service not loaded.");

        /*if (app.isLoaded('sql'))
            // Memorize
            $.sql.insert('BugServer', {
                // Context
                hash: hash,
                date: now,
                channelType, 
                channelId,
                // User
                user: request?.user?.name,
                ip: request?.ip,
                // Error
                stacktrace: error.stack || error.message,
                logs: logsHtml
            });*/

        // Update error message
        error.message = "A bug report has been sent to my personal mailbox. Sorry for the inconvenience.";
    }

    public async app( report: AppBugInfos ) {

        // Prevent duplicates
        if (!this.shouldSendReport(report.side, report.user, report.action, report.message))
            return;

        // Get context
        const now = new Date();
        const hash = uuid();

        // Send notification
        $.email.send({
            to: app.identity.author.email,
            subject: "Bug app: " + report.message,
            html: report
        });

        // Memorize
        $.sql.insert('BugApp', {
            // Context
            hash: hash,
            date: now,
            side: report.side,
            action: report.action,
            // User
            user: report.user, 
            ip: report.ip, 
            device: report.device, 
            // Client
            client: report.client, 
            build: report.build, 
            status: report.status, 
            // Error
            message: report.message,
            stacktrace: report.stacktrace,
        });
    }

}