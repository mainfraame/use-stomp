import {useCallback, useState} from 'react';

export default function useToggle(
    initialValue?: boolean
): [boolean, (nextValue?: boolean) => void] {
    const [value, setValue] = useState(!!initialValue);

    const toggle = useCallback((value?: boolean) => {
        setValue((prev) => (value === undefined ? !prev : value));
    }, []);

    return [value, toggle];
}
