import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dropzone from './Dropzone'

describe('Dropzone', () => {
  it('says "a file" (singular) when multiple is not set', () => {
    render(<Dropzone onFiles={vi.fn()} />)
    expect(screen.getByText(/drop a file here/i)).toBeInTheDocument()
  })
})
