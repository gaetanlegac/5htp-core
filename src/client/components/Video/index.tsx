/*----------------------------------
- DEPS
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Core
import Button from '../button';

/*----------------------------------
- TYPES
----------------------------------*/

export type Config = {
    src: string,
    previewImg: string,
    color?: string
}

/*----------------------------------
- COMPONENT
----------------------------------*/
export default ({ src, previewImg, color = '000000' }: Config) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [state, setState] = React.useState<'inactive'|'loading'|'paused'|'playing'>('inactive');

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    const play = () => {
        setState('loading');
    }

    const VideoPlayer = 'video';

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <section class={"video h-4 " + state}>

            {(state === 'inactive' || state === 'loading') ? (
                <img class="preview" src={previewImg} />
            ) : (
                <VideoPlayer src={src} />
            )}

            <div class="actions col al-center" style={{
                backgroundColor: '#' + color + 'aa'
            }}>
                {(state === 'inactive' || state === 'paused') ? (
                    <Button icon="play" shape="pill" onClick={play} />
                ) : state === 'loading' ? (
                    <i src="spin" />
                ) : state === 'playing' ? (
                    <Button icon="pause" shape="pill" onClick={play} />
                ) : null}
            </div>

        </section>
    )
}