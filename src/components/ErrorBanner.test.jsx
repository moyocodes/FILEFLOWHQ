import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBanner from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders nothing when there are no messages', () => {
    const { container } = render(<ErrorBanner messages={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a null message', () => {
    const { container } = render(<ErrorBanner messages={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a single message string', () => {
    render(<ErrorBanner messages="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders every message in an array, skipping falsy ones', () => {
    render(<ErrorBanner messages={['First problem', null, 'Second problem']} />)
    expect(screen.getByText('First problem')).toBeInTheDocument()
    expect(screen.getByText('Second problem')).toBeInTheDocument()
  })

  it('hides the dismiss button when onDismiss is not provided', () => {
    render(<ErrorBanner messages="Oops" />)
    expect(screen.queryByRole('button', { name: /dismiss error/i })).not.toBeInTheDocument()
  })

  it('calls onDismiss when the dismiss button is clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<ErrorBanner messages="Oops" onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: /dismiss error/i }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
