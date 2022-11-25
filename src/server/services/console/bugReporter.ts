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

export type ServerBug = {
    // Context
    hash: string,
    date: Date, // Timestamp
    channelType?: string, 
    channelId?: string,

    user: string | null | undefined,
    ip: string | null | undefined,
    
    // Error
    stacktrace: string,
    logs: string
}

export type ApplicationBug = {
    // Context
    hash: string,
    date: Date,
    side: string,
    action: string,
    // User
    user: string | null | undefined,
    ip: string | null | undefined,
    device: string, 
    // Client
    client: string,
    build: string,
    status: string,
    // Error
    message: string,
    stacktrace: string
}

const config = app.config.console;

/*----------------------------------
- CONFIG
----------------------------------*/

const errorMailInterval = (1 * 60 * 60 * 1000); // 1 hour

const LogPrefix = '[console][bugReporter]'

export type TTransport = {
    name: string,
    send: TransportSender
}

export type Bug = ServerBug | ApplicationBug

type TransportSender = (report: Bug, error?: Error) => Promise<any>

/*----------------------------------
- SERVICE
----------------------------------*/
export default class BugReporter {

    private transporters: TTransport[] = [];

    public addTransporter( name: string, sender: TransportSender ) {
        console.log(LogPrefix, `Register trabsporter ${name} ...`);
        this.transporters.push({
            name,
            send: sender
        })
    }

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
        console.error(LogPrefix, `Sending bug report for the following error:`, error);

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

        const bugReport: ServerBug = {
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
        }

        await this.sendToTransporters(bugReport);

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

        const bugReport: ApplicationBug = {

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
        }

        await this.sendToTransporters(bugReport);

        /* // Send notification
        $.email.send({
            to: app.identity.author.email,
            subject: "Bug app: " + report.message,
            html: report
        });

        // Memorize
        $.sql.insert('BugApp', );*/
    }

    private async sendToTransporters( bugReport: Bug, error?: Error ) {

        // Check if a transporter if configurated
        if (this.transporters.length === 0) {
            console.warn(LogPrefix, `No transporter configurated to report this error.`);
            return false;
        }

        // Send report to trabporters
        await Promise.all( 
            this.transporters.map( transport => {
                console.log(LogPrefix, `Report via transporter ${transport.name} ...`);
                return transport.send(bugReport, error);
            }) 
        );
    }

}