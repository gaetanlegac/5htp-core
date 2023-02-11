/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import { v4 as uuid } from 'uuid';
import { Logger, ILogObject } from "tslog";
import { format as formatSql } from 'sql-formatter';
import highlight from 'cli-highlight';

// Core libs
import Application, { Service, TPriority } from '@server/app';
import context from '@server/context';
import type ServerRequest from '@server/services/router/request';
import { SqlError } from '@server/services/database/debug';

// Specific
import logToHTML from './html';

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

type TLogProfile = 'silly' | 'info' | 'warn' | 'error'

export type Config = {
    dev: {
        level: TLogProfile,
    },
    prod: {
        level: TLogProfile
    }
}

export type Hooks = {

}

/*----------------------------------
- TYPES
----------------------------------*/

export type ChannelInfos = {
    channelType: 'cron' | 'master' | 'request' | 'socket',
    channelId?: string,
}

export type TGuestLogs = {
    id: string,
    meet: Date,
    activity: Date,

    device: string,
    ip: string,
    user?: string
}   

export type TRequestLogs = {

    id: string,
    date: Date,

    method: string,
    url: string,
    data: TObjetDonnees,

    ip: string,
    user?: string,
    clientId: string,

    statusCode: number,
    time: number
}

export type TQueryLogs = ChannelInfos & {
    date: Date, 
    query: string,
    time: number,
}

export type TLog = ChannelInfos & {

}

/*----------------------------------
- TYPES: BUG REPORT
----------------------------------*/
export type ServerBug = {

    type: 'server',

    // Context
    hash: string,
    date: Date, // Timestamp
    channelType?: string, 
    channelId?: string,

    user: string | null | undefined,
    ip: string | null | undefined,
    
    // Error
    error: Error,
    stacktrace: string,
    logs: string,
}

/*----------------------------------
- CONST
----------------------------------*/

const LogPrefix = '[console]'

const errorMailInterval = (1 * 60 * 60 * 1000); // 1 hour

const logFields = [
    'date',
    'logLevelId',
    'logLevel',

    'isConstructor',
    'methodName',
    'functionName',
    'typeName',

    'filePath',
    'lineNumber',
    'argumentsArray',
    'stack',
]

/*----------------------------------
- LOGGER
----------------------------------*/
export default class Console extends Service<Config, Hooks, Application> {

    // Load before all
    public priority: TPriority = 2;

    // Services
    public logger!: Logger;

    // Buffers
    public logs: TLog[] = [];
    public clients: TGuestLogs[] = [];
    public requests: TRequestLogs[] = [];
    public sqlQueries: TQueryLogs[] = [];
    // Bug ID => Timestamp latest send
    private sentBugs: {[bugId: string]: number} = {};

    // Adapters
    public log = console.log;
    public warn = console.warn;
    public info = console.info;
    public error = console.error;

    /*----------------------------------
    - INSTANCE
    ----------------------------------*/
    public async register() {

    }

    public async start() {

        const envConfig = this.config[ this.app.env.profile ];

        this.logger = new Logger({
            overwriteConsole: true,
            //type: this.app.env.profile === 'dev' ? 'pretty' : 'hidden',
            requestId: (): string => {
                const { channelType, channelId } = this.getChannel();
                return channelId === undefined ? channelType : channelType + ':' + channelId;
            },
            displayRequestId: false,
            prettyInspectOptions: {
                depth: 2
            }
        });

        this.logger.attachTransport({
            silly: this.logEntry.bind(this),
            debug: this.logEntry.bind(this),
            trace: this.logEntry.bind(this),
            info: this.logEntry.bind(this),
            warn: this.logEntry.bind(this),
            error: this.logEntry.bind(this),
            fatal: this.logEntry.bind(this),
        }, envConfig.level);

        setInterval(() => this.clean(), 60000);

        // Send email report
        this.app.on('error', this.createBugReport.bind(this));
    }

    private clean() {
        // Clean memory from old logs
    }

    /*----------------------------------
    - LOGGING
    ----------------------------------*/

    public async createBugReport( error: Error, request?: ServerRequest ) {

        // Print the error so it's accessible via logs
        if (error instanceof SqlError)  {
            let printedQuery: string;
            try {
                printedQuery = this.printSql( error.query );
            } catch (error) {
                printedQuery = 'Failed to print query:' + (error || 'unknown error');
            }
            console.error(`Error caused by this query:`, printedQuery);
        }
        console.error(LogPrefix, `Sending bug report for the following error:`, error);

        // Prevent spamming the mailbox if infinite loop 
        const bugId = ['server', request?.user?.name, undefined, error.message].filter(e => !!e).join('::');
        const lastSending = this.sentBugs[bugId];
        this.sentBugs[bugId] = Date.now();
        const shouldSendReport = lastSending === undefined || lastSending < Date.now() - errorMailInterval;
        if (!shouldSendReport)
            return;

        // Get context
        const now = new Date();
        const hash = uuid();
        const { channelType, channelId } = this.getChannel();

        // On envoi l'email avant l'insertion dans bla bdd
        // Car cette denrière a plus de chances de provoquer une erreur
        const logsHtml = this.printHtml(
            this.logs.filter(e => e.channelId === channelId), 
            true
        );

        const bugReport: ServerBug = {

            type: 'server',

            // Context
            hash: hash,
            date: now,
            channelType, 
            channelId,
            // User
            user: request?.user?.email,
            ip: request?.ip,
            // Error
            error,
            stacktrace: error.stack || error.message,
            logs: logsHtml
        }

        await this.runHook('bugReport', bugReport);
    }

    public getChannel() {
        return context.getStore() || {
            channelType: 'master',
            channelId: undefined
        }
    }

    private logEntry(entry: ILogObject) {

        const [channelType, channelId] = entry.requestId?.split(':') || ['master'];
        if (entry.requestId === 'admin')
            return;

        // Only keep data required by printPrettyLog
        // https://github.com/fullstack-build/tslog/blob/4f045d61333230bd0f9db0e0d59cb1e81fc03aa6/src/LoggerWithoutCallSite.ts#L509
        const miniLog: TObjetDonnees = { channelType, channelId };
        for (const k of logFields)
            miniLog[k] = entry[k];

        // remove webpack path
        if (miniLog.filePath !== undefined) {

            const appPrefix = '/webpack:/' + this.app.pkg.name + '/src/';
            const appPrefixIndex = miniLog.filePath.indexOf(appPrefix);

            const corePrefix = '/webpack:/' + this.app.pkg.name + '/node_modules/5htp-core/src/';
            const corePrefixIndex = miniLog.filePath.indexOf(corePrefix);

            if (appPrefixIndex !== -1)
                miniLog.filePath = '@/' + miniLog.filePath.substring(appPrefixIndex + appPrefix.length);
            else if (corePrefixIndex !== -1)
                miniLog.filePath = '@' + miniLog.filePath.substring(corePrefixIndex + corePrefix.length);

        }

        this.logs.push(miniLog as TLog);
    }

    public client(client: TGuestLogs) {
        this.clients.push(client);
    }

    public request(request: TRequestLogs) {

        if (request.id === 'admin')
            return;

        this.requests.push( request );
    }

    /*----------------------------------
    - READ
    ----------------------------------*/

    /*public getClients() {
        return sql`
            SELECT * FROM logs.Clients
            ORDER BY activity DESC
            LIMIT 100
        `.all();
    }

    public async getClient(clientId: string) {
        return (
            this.clients.find(c => c.id === clientId)
            ||
            await sql`
                SELECT * FROM logs.Clients
                WHERE id = ${clientId}
            `.first()
        )
    }

    public getRequests(clientId?: string) {
        return sql`
            SELECT * FROM logs.Requests
            ORDER BY date DESC
            LIMIT 100
        `.all();
    }

    public async getRequest(requestId: string) {
        return (
            this.requests.find(r => r.id === requestId)
            ||
            await sql`
                SELECT * FROM logs.Requests
                WHERE id = ${requestId}
            `.first()
        )
    }

    public getQueries( channelType: ChannelInfos["channelType"], channelId?: string ) {

        const filters: Partial<TQueryLogs> = { channelType };
        if (channelId !== undefined)
            filters.channelId = channelId;

        return sql`
            SELECT * FROM logs.Queries
            WHERE :${filters} 
            ORDER BY date DESC
            LIMIT 100
        `.all();
    }*/

    public async getLogs( channelType: ChannelInfos["channelType"], channelId?: string ) {

        const filters: Partial<TQueryLogs> = { channelType };
        if (channelId !== undefined)
            filters.channelId = channelId;

        const fromBuffer = this.logs.filter(
            e => e.channelId === channelId && e.channelType === channelType
        ).reverse();
        
        return this.printHtml(fromBuffer);
    }
 
    public printHtml(logs: TLog[], full: boolean = false): string {

        let html = logs.map( logEntry => logToHTML( logEntry, this )).join('\n');

        if (full) {
            const consoleCss = `background: #000; padding: 20px; font-family: 'Fira Mono', 'monospace', 'Monaco'; font-size: 12px; line-height: 20px;`
            html = '<div style="' + consoleCss + '">' + html + '</div>';
        }

        return html;
    }

    public printSql = (requete: string) => highlight(
        requete,//formatSql(requete, { indent: ' '.repeat(4) }),
        { language: 'sql', ignoreIllegals: true }
    )

}