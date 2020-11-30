# < use-stomp >

react providers, decorators, and hooks for handling websockets using the stomp protocol.

## Components

## Providers 

### < [UseStompWorkerProvider](src/useStompNotificationsProvider.tsx) >

This is the shared-worker provider. It connects to the websocket (stomp), and controls the queueing of a notifications.
The list is based on the messages received from the websocket channel.

- queueing/dismissal management
- cross tab/window syncing of notifications

Please see the typescript definition for the provider for the full list of props.

```typescript jsx
import React, {useState} from 'react';
import {UseStompWorkerProvider} from 'use-stomp';

const App = () => {

    const [authHeaders] = useState({
        Authorization: 'auth-token'
    })

    return (
        <UseStompWorkerProvider
            authHeaders={authHeaders}
            url='ws://ws-endpoint'>
            <App/>
        </UseStompWorkerProvider>
    )
}
```

Make sure your public/dist folder contains the [webSocketWorkerInstance.js](./webSocketWorkerInstance.js) AND
the [webSocketWorkerInstance.js.map](./webSocketWorkerInstance.js.map) files:

```
node_modules/use-stomp/webSocketWorkerInstance.js
node_modules/use-stomp/webSocketWorkerInstance.js.map
```


### < [UseStompProvider](src/useStompProvider.tsx) >

This is the non shared-worker provider, and does not provide any queueing functionality. Instead, 
it provides a way to subscribe to messages and send messages to channels.

Please see the typescript definition for the provider; it has notes regarding all the properties available.

```typescript jsx
import React, {useState} from 'react';
import {UseStompProvider} from 'use-stomp';

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

### [useStompNotifications](./src/useStompNotifications.ts)

\* This only works with [useStompNotificationsProvider](src/useStompNotificationsProvider.tsx)

```typescript jsx
import React from 'react';
import {useStompNotifications} from 'use-stomp';

export default () => {

    const [list, ,connected] = useStompNotifications('channel');

    return (
        <>
            <h4>Status: {connected}</h4>

            <h4>Notifications:</h4>

            <ul>
                {list.map((item) => (
                    <li key={item.id}>
                       <button 
                          onClick={item.dismiss}>
                          X
                        </button>
                    </li>
                ))}
            </ul>
        </>
    )
}
```

### [useStomp](./src/useStomp.ts)

```typescript jsx
import React from 'react';
import {useStomp} from 'use-stomp';

export default () => {

    const [message, send] = useStomp('channel');

    return (

        <>
            <button onClick={() => send('my other message')}>
               send
            </button>

            <h4>Latest Message</h4>

            <div>{message}</div>
        </>
    )
}
```

### [UseStompCtx](./src/useStompCtx.ts)

If you need direct access to the context, use this hook.

## Decorators

### [@withUseStomp](src/withUseStomp.tsx)

The decorator allows you to use the useStomp hook with legacy class-based components.

```typescript jsx
import React from 'react';
import {withUseStomp} from 'use-stomp';

@withUseStomp('/message/channel')
class ExampleDecorator extends React.Component {

    _sendMesage = () => {
        this.props.sendMessage('test')
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

### [@withUseStomp](src/withUseStomp.tsx)

This decorator provides decorates your component with the props provided by ```useStompNotifications```. For use with legacy class-based components

```typescript jsx
import React from 'react';
import {withUseStompNotifications} from 'use-stomp';

@withUseStompNotifications('/message/channel')
class ExampleDecorator extends React.Component {

    _sendMesage = () => {
        this.props.sendMessage('test')
    }

    return (
        <>
            <h4>Status: {this.props.connected}</h4>

            <h4>Notifications:</h4>

            <ul>
                {this.props.list.map((item) => (
                    <li key={item.id}>
                       <button 
                          onClick={item.dismiss}>
                          X
                        </button>
                    </li>
                ))}
            </ul>
        </>
    )
}
```
