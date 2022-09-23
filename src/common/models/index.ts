

export const UserRoles = ['USER', 'ADMIN', 'TEST', 'DEV'] as const
export type TUserRole = typeof UserRoles[number]

export interface User {
    name: string,
    email: string,
    emailHash: string,
    roles: TUserRole[],

    balance: number,
    banned?: Date,
}

export const GuestUser = {
    name: "Guest",

    balance: 10,
    multiplier: 1,
    level: 1,

    isGuest: true
}

export interface IP {
    address: string,

    country: string,
    isp?: string,
    user_name?: string,

    meet: Date,
    activity: Date,
    updated?: Date,

    iphub?: number,
    getipintel?: number,
    ipinfo?: number,

    banned?: Date,
    banReason?: string,
}