  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    
    const fd = new FormData(e.currentTarget);
    
    // Attach our state to the form data
    fd.append("totalAmount", total?.toString() || "0");
    fd.append("savingsAmt", amounts.savings || "0");
    fd.append("normalAmt", amounts.normal || "0");
    fd.append("emergencyAmt", amounts.emergency || "0");
    fd.append("method", method || "");

    try {
      await submitBulkPayment(fd);
      router.push("/dashboard?msg=Payment submitted for approval");
    } catch (error: any) {
      console.error(error); // Log to browser console
      setErr(error.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }