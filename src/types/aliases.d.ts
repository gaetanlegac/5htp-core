declare module "@/client/pages/\*.tsx" {
    const value: import("../client/router").TRoutesLoaders;
    export = value;
}
declare module "@client/pages/\*.tsx" {
    const value: import("../client/router").TRoutesLoaders;
    export = value;
}

// Basic Models
declare module "@/server/models/User" {
    const User: import("../common/models").User;
    export = User;
}

declare module "@/server/models/IP" {
    const IP: import("../common/models").IP;
    export = IP;
}

declare module "@/server/services/auth" {
    const UserAuthService: import("../server/services/auth/base").default;
    export = UserAuthService;
}