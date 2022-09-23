import ScrollbarCustom, { 
    ScrollbarProps, 
    Scrollbar 
} from 'react-scrollbars-custom';

export type TScrollbar = ScrollbarCustom;

import React from 'react';
import { RefObject } from 'preact';

import './index.less';
export default ({ refScrollbar, ...props }: ScrollbarProps & {
    className?: string,
    refScrollbar?: RefObject<TScrollbar>
}) => {

    if (refScrollbar !== undefined)
        props.ref = (sb: TScrollbar | null) => refScrollbar.current = sb;

    // @ts-ignore
    return (
        <ScrollbarCustom
            noDefaultStyles
            {...props}
        />
    )
}
