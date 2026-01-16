document.addEventListener('DOMContentLoaded', () => {
  const paymentForm = document.getElementById('payment-form');
  const paymentMessage = document.getElementById('payment-message');

  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email-input').value;
      paymentMessage.textContent = 'Processing your request...';

      try {
        const response = await fetch('/api/create-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          const data = await response.json();
          // Redirect user to PayPal for payment approval
          window.location.href = data.approvalUrl;
        } else {
          const error = await response.json();
          paymentMessage.textContent = `Error: ${error.error || 'Could not connect to server.'}`;
          paymentMessage.style.color = '#ff4757';
        }
      } catch (error) {
        console.error('Payment creation error:', error);
        paymentMessage.textContent = 'An unexpected error occurred. Please try again later.';
        paymentMessage.style.color = '#ff4757';
      }
    });
  }
});