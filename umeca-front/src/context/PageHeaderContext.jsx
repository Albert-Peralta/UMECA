import { createContext, useContext, useState, useCallback } from 'react';

const PageHeaderContext = createContext(null);

export function PageHeaderProvider({ children }) {
    const [actions, setActions] = useState(null);

    const registerActions = useCallback((node) => {
        setActions(node);
    }, []);

    const clearActions = useCallback(() => {
        setActions(null);
    }, []);

    return (
        <PageHeaderContext.Provider value={{ actions, registerActions, clearActions }}>
            {children}
        </PageHeaderContext.Provider>
    );
}

export function usePageHeader() {
    return useContext(PageHeaderContext);
}
