export function buildExpenseRecord({
  id,
  baseData,
  formData,
  currentUser,
}) {
  return {
    ...(id ? { id } : {}),
    ...baseData,
    type: formData.type,
    staffId: formData.staffId || "",
    staffName: formData.staffName || "",
    relatedFileId: formData.relatedFileId || "",
    relatedFileType: formData.relatedFileType || "",
    relatedFileName: formData.relatedFileName || "",
    addedById: currentUser?.id || "",
    addedByName: currentUser?.name || "",
  };
}

export function buildExpenseForDb(expense) {
  return {
    id: expense.id,
    amount: expense.amount,
    date: expense.date,
    description: expense.description,
    purpose: expense.purpose,
    category: expense.category,
    addedById: expense.addedById,
    addedByName: expense.addedByName,
    type: expense.type,
    staffId: expense.staffId,
    staffName: expense.staffName,
    relatedFileId: expense.relatedFileId,
    relatedFileType: expense.relatedFileType,
    relatedFileName: expense.relatedFileName,
  };
}
