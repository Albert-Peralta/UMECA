import { createContext, useContext, useRef, useCallback } from 'react';

const FormGuardContext = createContext(null);

export const FormGuardProvider = ({ children }) => {
    const dirtyRef = useRef(false);

    const setFormDirty = useCallback((value) => {
        dirtyRef.current = value;
    }, []);

    const isFormDirty = useCallback(() => dirtyRef.current, []);

    return (
        <FormGuardContext.Provider value={{ setFormDirty, isFormDirty }}>
            {children}
        </FormGuardContext.Provider>
    );
};

export const useFormGuard = () => useContext(FormGuardContext);
