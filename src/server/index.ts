import AppContainer from './app/container';
import '@/server/config/*.ts';
import Application from '@/server';
AppContainer.start( Application );