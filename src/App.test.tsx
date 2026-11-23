import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('Briefcraft', () => {
  it('shows briefs with completeness', () => {
    window.location.hash = '/briefs';
    render(<App />);
    expect(screen.getAllByRole('img', { name: /% complete/ }).length).toBe(2);
    expect(screen.getAllByText('Demo data').length).toBe(2);
  });

  it('lists problems in a section and clears them when fixed', async () => {
    window.location.hash = '/brief/demo-bakery/goals';
    const user = userEvent.setup();
    render(<App />);
    const list = screen.getByRole('list', { name: 'To fix in this section' });
    expect(within(list).getByText(/measure for “Make the site feel modern” is vague/)).toBeInTheDocument();
    const measure = screen.getAllByLabelText(/How you’ll know it worked/)[2];
    await user.clear(measure);
    await user.type(measure, 'Customer survey score of 8/10 by April');
    expect(screen.queryByRole('list', { name: 'To fix in this section' })).not.toBeInTheDocument();
  });

  it('creates a brief from a template and walks to the next section', async () => {
    window.location.hash = '/briefs';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Create brief' }));
    expect(screen.getByText('Name the project.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Project'), 'Brand refresh');
    await user.selectOptions(screen.getByLabelText('Start from'), 'brand');
    await user.click(screen.getByRole('button', { name: 'Create brief' }));
    expect(await screen.findByRole('heading', { name: '1. Overview' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Goals →' }));
    expect(await screen.findByRole('heading', { name: '2. Goals' })).toBeInTheDocument();
  });

  it('adds scope items and requirements', async () => {
    window.location.hash = '/brief/demo-gallery/scope';
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Add to Out of scope'), 'Website');
    await user.click(screen.getAllByRole('button', { name: 'Add' })[1]);
    expect(screen.getByRole('button', { name: 'Remove Website' })).toBeInTheDocument();
  });

  it('reviews the brief with all issues and the document', () => {
    window.location.hash = '/brief/demo-bakery/review';
    render(<App />);
    expect(screen.getByText(/things to resolve before sign-off/)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Brief document' })).toHaveTextContent('Online ordering for collection');
    expect(screen.getByRole('table', { name: 'Risks by severity' })).toBeInTheDocument();
  });
});
