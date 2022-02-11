# < react-use-stomp >

react providers, decorators, and hooks for handling websockets using the stomp protocol.

## Components

## Providers

### < [UseStompProvider](src/useStompProvider.tsx) >

This is the non shared-worker provider, and does not provide any queueing functionality. Instead,
it provides a way to subscribe to messages and send messages to channels.

Please see the typescript definition for the provider; it has notes regarding all the properties available.

```typescript jsx
import React, {useState} from 'react';
import {UseStompProvider} from 'react-use-stomp';

const App = () => {

    const [authHeaders] = useState({
        Authorization: 'auth-token'
    })

    return (
        <UseStompProvider
            authHeaders={authHeaders}
            url='ws://ws-endpoint'>
            <App/>
        </UseStompProvider>
    )
}
```

## Hooks

### [useStomp](./src/useStomp.ts)

```typescript jsx
import React from 'react';
import {useStomp} from 'react-use-stomp';

export default () => {

    const [message, send] = useStomp('channel');

    const sendMessageToDifferentChannel = () => {
        send('/app/message', {
            message: 'toSameChannel'
        });
    };

    const sendMessageToSameChannel = () => {
        send({
            message: 'toSameChannel'
        });
    };

    return (

        <>
            <button onClick={sendMessageToDifferentChannel}>
                send message to different channel
            </button>

            <button onClick={sendMessageToSameChannel}>
                send message to same channel
            </button>

            <h4>Latest Message</h4>

            <div>{message}</div>
        </>
    )
}
```

### [UseStompCtx](./src/useStompCtx.ts)

If you need direct access to the context, use this hook.

```typescript jsx
import React from 'react';
import {useStompCtx} from 'react-use-stomp';

export default () => {

    const context = useStompCtx();

    // do whatever with it.
};
```

## Decorators

### [@withUseStomp](src/withUseStomp.tsx)

The decorator allows you to use the useStomp hook with legacy class-based components.

```typescript jsx
import React from 'react';
import {withUseStomp} from 'react-use-stomp';

@withUseStomp('/message/channel')
class ExampleDecorator extends React.Component {

    _sendMessageToDifferentChannel = () => {
        this.props.sendMessage('/app/messages', 'test');
    }

    _sendMesageToSameChannel = () => {
        this.props.sendMessage('test');
    }

    return (
        <>
            <button onClick={this._sendMessageToDifferentChannel}>
                send message to different channel
            </button>

            <button onClick={this._sendMesageToSameChannel}>
                send message to same channel
            </button>

            <h4>Latest Message</h4>

            <div>{this.props.message}</div>
        </>
    )
}
```
