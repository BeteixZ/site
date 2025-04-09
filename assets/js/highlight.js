/**
 * Text highlighting animation
 * This script handles the animation of highlighted text (mark elements)
 * when they enter the viewport.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get all mark elements
    const highlights = document.querySelectorAll('mark');
    
    // Exit if no marks are found
    if (!highlights.length) return;
    
    // Configure the IntersectionObserver
    const options = {
      root: null, // use the viewport
      rootMargin: '0px 0px -100px 0px', // negative bottom margin so elements trigger before they're fully visible
      threshold: 0.3 // trigger when at least 30% of the element is visible
    };
    
    // Create the observer
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Add a small staggered delay based on position in document
          // to create a cascade effect if multiple highlights are visible
          const index = Array.from(highlights).indexOf(entry.target);
          setTimeout(() => {
            entry.target.classList.add('animate');
          }, index * 150);
          
          // Stop observing after animation is triggered
          observer.unobserve(entry.target);
        }
      });
    }, options);
    
    // Start observing each mark element
    highlights.forEach(highlight => {
      observer.observe(highlight);
    });
    
    // Debug function to help identify issues
    function debugHighlights() {
      if (highlights.length === 0) {
        console.log('No mark elements found in the document');
      } else {
        console.log(`Found ${highlights.length} mark elements`);
        highlights.forEach((el, i) => {
          console.log(`Mark #${i+1}: ${el.textContent.substring(0, 20)}...`);
        });
      }
    }
    
    // Uncomment the line below to debug highlight elements
    // debugHighlights();
  });