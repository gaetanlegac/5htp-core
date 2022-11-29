declare module "@/client/pages/\*.tsx" {
    const value: import("../client/router").TRoutesLoaders;
    export = value;
}
declare module "@client/pages/\*.tsx" {
    const value: import("../client/router").TRoutesLoaders;
    export = value;
}

declare module "@/server/services/auth" {
    const UserAuthService: import("../server/services/auth/base").default;
    export = UserAuthService;
}