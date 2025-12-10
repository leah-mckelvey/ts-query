import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from './context';
export function useMutation(options) {
    const client = useQueryClient();
    const mutationRef = useRef(client.createMutation(options));
    const mutation = mutationRef.current;
    const [state, setState] = useState(mutation.state);
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        const unsubscribe = mutation.subscribe((newState) => {
            if (isMountedRef.current) {
                setState(newState);
            }
        });
        return () => {
            isMountedRef.current = false;
            unsubscribe();
        };
    }, [mutation]);
    const mutate = useCallback(async (variables) => {
        return mutation.mutate(variables);
    }, [mutation]);
    const reset = useCallback(() => {
        mutation.reset();
    }, [mutation]);
    return {
        mutate,
        mutateAsync: mutate,
        reset,
        state,
    };
}
//# sourceMappingURL=use-mutation.js.map