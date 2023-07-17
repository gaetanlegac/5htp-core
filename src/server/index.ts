// Load Application container
import './app/container';

// Load services setup
import '@/server/config/*.ts';

// Load Application
import application from './app/instance';

// Start application
application.start();