document.addEventListener('DOMContentLoaded', function() {
  console.log('Test extension loaded');
  
  const button = document.getElementById('test-button');
  const result = document.getElementById('result');
  
  if (button) {
    button.addEventListener('click', function() {
      console.log('Button clicked');
      alert('Button works!');
      result.textContent = 'Button was clicked at: ' + new Date().toLocaleTimeString();
    });
  } else {
    console.error('Button element not found');
  }
}); 