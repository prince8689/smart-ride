import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StarRating from './StarRating';

describe('StarRating Component', () => {
  test('renders 5 stars by default', () => {
    render(<StarRating />);
    const stars = screen.getAllByRole('img', { hidden: true }).filter(el => el.tagName === 'svg');
    expect(stars).toHaveLength(5);
  });

  test('displays correct rating', () => {
    render(<StarRating rating={3.5} showNumber={true} />);
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  test('triggers onRate when interactive and clicked', () => {
    const handleRate = jest.fn();
    render(<StarRating interactive={true} onRate={handleRate} />);
    
    const stars = screen.getAllByRole('img', { hidden: true }).filter(el => el.tagName === 'svg');
    fireEvent.click(stars[3]); // Click the 4th star
    
    expect(handleRate).toHaveBeenCalledWith(4);
  });
});
