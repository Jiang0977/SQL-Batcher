import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState({
        title: 'Confirm',
        message: 'Are you sure?',
        okText: 'OK',
        cancelText: 'Cancel'
    });

    const resolverRef = useRef(null);

    const confirm = useCallback((opts = {}) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setOptions(prev => ({
                ...prev,
                ...opts
            }));
            setIsOpen(true);
        });
    }, []);

    const handleClose = useCallback((result) => {
        setIsOpen(false);
        const resolver = resolverRef.current;
        resolverRef.current = null;
        if (typeof resolver === 'function') {
            resolver(result);
        }
    }, []);

    const value = useMemo(() => ({ confirm }), [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            {isOpen && (
                ReactDOM.createPortal(
                    <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                        <div className="confirm-dialog">
                            <h3 id="confirm-title" className="confirm-title">{options.title}</h3>
                            <div className="confirm-message">{options.message}</div>
                            <div className="confirm-actions">
                                <button className="confirm-button cancel" onClick={() => handleClose(false)}>{options.cancelText || 'Cancel'}</button>
                                <button className="confirm-button ok" onClick={() => handleClose(true)} autoFocus>{options.okText || 'OK'}</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return ctx.confirm;
};


