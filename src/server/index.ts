import AppContainer from './app/container';
import '@/server/config/*.ts';
import Application from '@/server';

const app = AppContainer.start( Application );

export default app.handleRequest;