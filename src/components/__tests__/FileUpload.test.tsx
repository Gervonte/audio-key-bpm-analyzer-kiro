import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { FileUpload } from '../FileUpload'
import { createValidAudioFile, createUnsupportedFile } from '../../utils/test-validation'

// Mock the validation module
vi.mock('../../utils/validation', async () => {
  const actual = await vi.importActual('../../utils/validation')
  return {
    ...actual,
    validateAudioFile: vi.fn(),
    formatFileSize: actual.formatFileSize
  }
})

const renderWithChakra = (component: React.ReactElement) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {component}
    </ChakraProvider>
  )
}

describe('FileUpload Component', () => {
  const mockOnFileSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render file upload interface', () => {
    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} />
    )

    expect(screen.getByText(/drag & drop your audio file here/i)).toBeInTheDocument()
    expect(screen.getByText(/choose file/i)).toBeInTheDocument()
    expect(screen.getByText(/supported formats/i)).toBeInTheDocument()
    expect(screen.getByText(/maximum file size/i)).toBeInTheDocument()
  })

  it('should show processing state when isProcessing is true', () => {
    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={true} />
    )

    expect(screen.getByText(/processing\.\.\./i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should handle file selection via input', async () => {
    const { validateAudioFile } = await import('../../utils/validation')
    const mockValidateAudioFile = validateAudioFile as any
    mockValidateAudioFile.mockReturnValue({ isValid: true })

    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} />
    )

    const validFile = createValidAudioFile()

    // Get the hidden input element
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await userEvent.upload(hiddenInput, validFile)

    expect(mockOnFileSelect).toHaveBeenCalledWith(validFile)
  })

  it('should show error for invalid files', async () => {
    const { validateAudioFile } = await import('../../utils/validation')
    const mockValidateAudioFile = validateAudioFile as any
    mockValidateAudioFile.mockReturnValue({
      isValid: false,
      error: 'Unsupported file format'
    })

    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} />
    )

    const invalidFile = createUnsupportedFile()
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement

    // Simulate file selection directly on the input element
    Object.defineProperty(hiddenInput, 'files', {
      value: [invalidFile],
      writable: false,
    })

    // Trigger the change event
    fireEvent.change(hiddenInput)

    // Debug: Check if the mock was called
    expect(mockValidateAudioFile).toHaveBeenCalledWith(invalidFile)

    await waitFor(() => {
      expect(screen.getByText(/upload error/i)).toBeInTheDocument()
      expect(screen.getByText(/unsupported file format/i)).toBeInTheDocument()
    })

    expect(mockOnFileSelect).not.toHaveBeenCalled()
  })

  it('should handle drag and drop events', async () => {
    const { validateAudioFile } = await import('../../utils/validation')
    const mockValidateAudioFile = validateAudioFile as any
    mockValidateAudioFile.mockReturnValue({ isValid: true })

    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} />
    )

    const validFile = createValidAudioFile()
    const dropZone = screen.getByText(/drag & drop your audio file here/i).closest('div')

    // Simulate drag over
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [validFile]
      }
    })

    expect(screen.getByText(/drop your audio file here/i)).toBeInTheDocument()

    // Simulate drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [validFile]
      }
    })

    expect(mockOnFileSelect).toHaveBeenCalledWith(validFile)
  })

  it('should prevent drag and drop when processing', () => {
    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={true} />
    )

    const validFile = createValidAudioFile()
    const dropZone = screen.getByText(/drag & drop your audio file here/i).closest('div')

    // Simulate drop while processing
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [validFile]
      }
    })

    expect(mockOnFileSelect).not.toHaveBeenCalled()
  })

  it('should show drag over state', () => {
    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} />
    )

    const validFile = createValidAudioFile()
    const dropZone = screen.getByText(/drag & drop your audio file here/i).closest('div')

    // Simulate drag over
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [validFile]
      }
    })

    expect(screen.getByText(/drop your audio file here/i)).toBeInTheDocument()

    // Simulate drag leave
    fireEvent.dragLeave(dropZone!)

    expect(screen.getByText(/drag & drop your audio file here/i)).toBeInTheDocument()
  })

  it('should handle click to open file dialog', async () => {
    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} />
    )

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    const dropZone = screen.getByText(/drag & drop your audio file here/i).closest('div')

    await userEvent.click(dropZone!)

    expect(clickSpy).toHaveBeenCalled()
  })

  it('should not open file dialog when processing', async () => {
    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={true} />
    )

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    const dropZone = screen.getByText(/drag & drop your audio file here/i).closest('div')

    await userEvent.click(dropZone!)

    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('should accept custom accepted formats', () => {
    const customFormats = ['mp3', 'wav']

    renderWithChakra(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        isProcessing={false}
        acceptedFormats={customFormats}
      />
    )

    expect(screen.getByText(/supported formats: MP3, WAV/i)).toBeInTheDocument()
  })

  it('should reset input value after file selection', async () => {
    const { validateAudioFile } = await import('../../utils/validation')
    const mockValidateAudioFile = validateAudioFile as any
    mockValidateAudioFile.mockReturnValue({ isValid: true })

    renderWithChakra(
      <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} />
    )

    const validFile = createValidAudioFile()
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await userEvent.upload(hiddenInput, validFile)

    expect(hiddenInput.value).toBe('')
  })
})