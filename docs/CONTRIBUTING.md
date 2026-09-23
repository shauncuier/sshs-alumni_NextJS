# Contributing Guidelines

**SSGHS Alumni Association**
(Sabuj Shikshayatan Government High School, Chattogram)
Website: [https://sabujsghs.edu.bd/](https://sabujsghs.edu.bd/)

---

## 🤝 Code of Conduct & Values

This platform serves generations of alumni, current students, teachers, and faculty. We hold our contributors to high standards of integrity, respect, and institutional prestige:
- Treat all alumni, regardless of batch year or seniority, with respect.
- Preserve school privacy and ensure sensitive contact information (phone numbers, addresses) remains protected.
- Never commit test credentials or live API keys to the repository.

---

## 🛠️ Development Workflow

1. **Fork or create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Code Style & Standards**:
   - Use TypeScript with strict typing.
   - Use Tailwind CSS tokens consistent with the school palette (`emerald-900`, `emerald-800`, `emerald-600`, `amber-500`).
   - Use Lucide Icons for consistent iconography.
   - Ensure all interactive elements have accessible labels and keyboard focus states.

3. **Verify Locally**:
   ```bash
   npm run lint
   npm run build
   ```
