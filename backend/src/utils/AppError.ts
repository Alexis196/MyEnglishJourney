export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(message, 401, "unauthorized");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No autorizado") {
    super(message, 403, "forbidden");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") {
    super(message, 404, "not_found");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string) {
    super(message, 409, code);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string, code: string) {
    super(message, 503, code);
  }
}

export class BudgetExceededError extends AppError {
  constructor(message = "Se alcanzó el presupuesto mensual de IA configurado") {
    super(message, 429, "ai_budget_exceeded");
  }
}
