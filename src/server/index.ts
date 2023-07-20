// Load Application container
import './app/container';

// Load services setup
import '@/server/config/*.ts';

// Load Application
import Application from '@/server';
const application = new Application;

// Start application
application.start();