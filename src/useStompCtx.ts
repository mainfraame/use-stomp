import {useContext} from 'react';

import UseStompCtx, {UseStompCtxProps} from './context';

export function useStompCtx(): UseStompCtxProps {
    return useContext(UseStompCtx);
}
