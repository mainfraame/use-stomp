# < use-stomp >

react provider, decorator, and a hook for websockets with the stomp protocol.

## Context - < [UseStompCtx](./src/context.ts) >

The context contains a function to subscribe to a given channel and a function to send a message to a channel. See the notes in the typescript definition file.

## Decorator - < [withStomp](./src/decorator.tsx) >

The decorator allows you to use the useStomp hook with legacy class-based components.

```typescript jsx

import React from 'react';
import {withUseStomp} from 'use-stomp';

@withUseStomp('channel')
class ExampleDecorator extends React.Component {

    _sendMesage = () => {
        this.props.sendMessage('test message')
    }

    return (
        <>
            <button onClick={this._sendMesage}>
               send
            </button>

            <h4>Latest Message</h4>

            <div>{this.props.message}</div>
        </>
    )
}
```

## Hook - < [useStomp](./src/hook.ts) >

```typescript jsx

import React from 'react';
import {useStomp} from 'use-stomp';

const ExampleDecorator = () => {
    
    const [message,send] = useStomp('channel');

    return (

        <>
            <button onClick={() => send()}>
               send
            </button>

            <h4>Latest Message</h4>

            <div>{message}</div>
        </>
    )
}
```

## Provider - < [UseStompProvider](./src/provider.tsx) >

Please see the typescript definition for the provider; it has notes regarding all the properties available.

```typescript jsx

import React from 'react';
import {UseStompProvider} from 'use-stomp';

const App = () => {
    return (

        <UseStompProvider
            url='ws://ws-endpoint'
            heartbeatChannel='heartbeat'
            heartbeatInterval={1000}>
            {/* rest of app */}
        </UseStompProvider>
    )
}
```
