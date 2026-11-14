
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("applicationForm");
  const message = document.getElementById("message");
  const submitBtn = document.getElementById("submitBtn");
  const receiptInput = document.getElementById("payment_receipt");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    let uploadedPath = null;

    try {
      const data = new FormData(form);

      const education = Array.from(
        form.querySelectorAll(
          'input[name="education_level"]:checked'
        )
      ).map(item => item.value);

      if (education.length === 0) {
        throw new Error("Please select at least one education level.");
      }

      const receipt = receiptInput.files[0];

      if (receipt && receipt.size > 5 * 1024 * 1024) {
        throw new Error("Receipt must not exceed 5MB.");
      }

      const applicationNumber =
        "MIA-" + crypto.randomUUID().replaceAll("-", "")
          .substring(0, 8).toUpperCase();

      if (receipt) {
        const extension = receipt.name.split(".").pop();
        uploadedPath =
          applicationNumber + "/" + crypto.randomUUID() + "." + extension;

        const { error: uploadError } =
          await supabaseClient.storage
            .from("payment-receipts")
            .upload(uploadedPath, receipt, {
              contentType: receipt.type,
              upsert: false
            });

        if (uploadError) throw uploadError;
      }

      const application = {
        application_number: applicationNumber,
        full_name: data.get("full_name").trim(),
        gender: data.get("gender"),
        age: Number(data.get("age")),
        neighborhood: data.get("neighborhood").trim(),
        town: data.get("town").trim(),
        local_government: data.get("local_government").trim(),
        state: data.get("state").trim(),
        phone_number: data.get("phone_number") || null,
        guardian_name: data.get("guardian_name").trim(),
        guardian_phone: data.get("guardian_phone") || null,
        islamiyya_school: data.get("islamiyya_school") || null,
        whatsapp_number: data.get("whatsapp_number") || null,
        quran_education: data.get("quran_education"),
        education_level: education,
        attended_before: data.get("attended_before") === "true",
        suggestions: data.get("suggestions") || null,
        signature: data.get("signature").trim(),
        application_date: data.get("application_date") || null,
        payment_option: data.get("payment_option") || null,
        payment_receipt_path: uploadedPath
      };

      const { error } = await supabaseClient
        .from("applications")
        .insert(application);

      if (error) throw error;

      message.style.color = "green";
      message.textContent =
        "Application submitted successfully! Your Application Number is: " +
        applicationNumber;

      form.reset();

    } catch (error) {
      console.error(error);
      message.style.color = "red";
      message.textContent =
        "Submission failed: " + error.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Application";
    }
  });
});
