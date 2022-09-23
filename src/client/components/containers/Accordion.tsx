import React from 'react';
import { ComponentChild } from 'preact';

export default ({ title, children }: {
    title: ComponentChild,
    children?: ComponentChild
}) => {

    const [visible, setVisible] = React.useState(false);

    return (
        <div class="pd-1">
            <header class="row sp-btw" onClick={() => setVisible(!visible)}>
                <h2>{title}</h2>
                <i src={visible ? "chevron-up" : "chevron-down"} />
            </header>
            {visible && (
                <div>
                    {typeof children === "string" ? <p>{children}</p> : children}
                </div>
            )}
        </div>
    )

}