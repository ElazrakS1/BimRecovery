// This script tests scrollbar appearance and behavior
// Run this script in the browser console to check for compatibility issues

(function() {
  console.log('Starting scrollbar compatibility test...');
  
  // Test for browser compatibility
  const browserInfo = {
    userAgent: navigator.userAgent,
    vendor: navigator.vendor,
    platform: navigator.platform
  };
  
  console.log('Browser information:', browserInfo);
  
  // Check if browser supports smooth scrolling
  const supportsScrollBehavior = 'scrollBehavior' in document.documentElement.style;
  console.log('Browser supports smooth scrolling:', supportsScrollBehavior);
  
  // Check if browser supports custom scrollbar styling
  const supportsWebkitScrollbar = CSS.supports('selector(::-webkit-scrollbar)');
  const supportsScrollbarWidth = CSS.supports('scrollbar-width', 'thin');
  const supportsScrollbarColor = CSS.supports('scrollbar-color', 'red blue');
  
  console.log('Scrollbar styling support:');
  console.log('- WebKit scrollbar:', supportsWebkitScrollbar);
  console.log('- Scrollbar width (Firefox):', supportsScrollbarWidth);
  console.log('- Scrollbar color (Firefox):', supportsScrollbarColor);
  
  // Check screen dimensions
  const screenInfo = {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio
  };
  
  console.log('Screen information:', screenInfo);
  
  // Test scrollbar width calculation
  function getScrollbarWidth() {
    // Create a div with overflow
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.width = '100px';
    outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
    document.body.appendChild(outer);
    
    // Force scrollbars
    outer.style.overflow = 'scroll';
    
    // Add inner div
    const inner = document.createElement('div');
    inner.style.width = '100%';
    outer.appendChild(inner);
    
    // Calculate the scrollbar width
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    
    // Clean up
    outer.parentNode.removeChild(outer);
    
    return scrollbarWidth;
  }
  
  const scrollbarWidth = getScrollbarWidth();
  console.log('Scrollbar width:', scrollbarWidth + 'px');
  
  // Create a test for each scrollable component
  function testScrollableComponent(selector) {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
      console.warn(`No elements found matching selector: ${selector}`);
      return false;
    }
    
    console.log(`Testing scrollable component: ${selector}`);
    console.log(`- Found ${elements.length} element(s)`);
    
    // Check computed styles for first element
    const element = elements[0];
    const styles = window.getComputedStyle(element);
    
    // Check overflow settings
    console.log(`- Overflow-y: ${styles.overflowY}`);
    console.log(`- Overflow-x: ${styles.overflowX}`);
    
    // Test smooth scrolling
    element.scrollTo({
      top: 50,
      behavior: 'smooth'
    });
    
    return true;
  }
  
  // Test all our scrollable components
  const components = [
    '.sidebar-menu',
    '.tree-container',
    '.model-tree',
    '.project-details',
    '.project-details-content',
    '.files-container',
    '.search-results-list',
    '.notification-list',
    '.dropdown-menu',
    '.user-management-content'
  ];
  
  const testResults = components.map(selector => ({
    selector,
    tested: testScrollableComponent(selector)
  }));
  
  console.log('Scrollbar test results:', testResults);
  console.log('Scrollbar compatibility test completed.');
  
  // Return test summary
  return {
    browser: browserInfo,
    supportsCustomScrollbars: supportsWebkitScrollbar || supportsScrollbarWidth,
    scrollbarWidth,
    screenInfo,
    componentTestResults: testResults
  };
})();
