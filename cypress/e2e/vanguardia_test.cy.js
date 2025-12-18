describe('Análisis de Calidad y Seguridad - App Web', () => {

  // Se ejecuta antes de cada prueba
  beforeEach(() => {
    cy.visit('http://localhost:5173'); // Ajusta si tu URL cambia
  });

  it('1. Debe cargar los elementos críticos de la UI', () => {
    cy.get('h1')
      .should('be.visible');

    cy.get('form')
      .should('exist');

    cy.get('button[type="submit"]')
      .should('be.enabled');
  });

  it('2. Prueba de Seguridad: Prevención de XSS en inputs', () => {
    const xssPayload = '<script>alert("xss")</script>';

    // Interceptamos cualquier intento de alert
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('alert');
    });

    cy.get('input[name="username"]')
      .should('exist')
      .type(xssPayload);

    cy.get('form').submit();

    // Confirmamos que el script no se ejecutó
    cy.get('@alert')
      .should('not.have.been.called');
  });

  it('3. Prueba de Resistencia: Prevención de doble clic', () => {
    cy.get('#btn-enviar')
      .should('be.visible')
      .and('be.enabled')
      .click()
      .click()
      .click()
      .should('be.disabled');
  });

  it('4. Validación de Responsividad (Mobile)', () => {
    // Simulamos un iPhone X
    cy.viewport('iphone-x');

    // El menú hamburguesa debe aparecer
    cy.get('.menu-toggle')
      .should('be.visible')
      .click();

    // El menú de navegación debe mostrarse
    cy.get('nav')
      .should('be.visible');
  });

});
