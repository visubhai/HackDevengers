import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../frontend/components/ui/button';
import React from 'react';

describe('Button Component', () => {
    it('renders correctly with children', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeDefined();
    });

    it('shows loading spinner when isLoading is true', () => {
        render(<Button isLoading>Click Me</Button>);
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        // Loader2 is an SVG with animate-spin class
        expect(document.querySelector('.animate-spin')).toBeDefined();
    });
});
