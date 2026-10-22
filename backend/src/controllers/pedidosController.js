const pedidosService = require('../services/pedidosService');

async function getAll(req, res) {
  try {
    const { estado, metodo_pago, limit } = req.query;
    const pedidos = await pedidosService.getAllPedidos({ estado, metodo_pago, limit });
    res.status(200).json(pedidos);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar pedidos: ' + err.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const pedido = await pedidosService.getPedidoById(id);
    if (!pedido) {
      return res.status(404).json({ error: `Pedido con ID ${id} no encontrado.` });
    }
    res.status(200).json(pedido);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar pedido: ' + err.message });
  }
}

async function create(req, res) {
  try {
    const { metodo_pago, cliente_nombre, notas, items } = req.body;

    const nuevoPedido = await pedidosService.createPedido({
      metodo_pago,
      cliente_nombre,
      notas,
      items
    });

    res.status(201).json(nuevoPedido);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function anular(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body || {};

    const resultado = await pedidosService.anularPedido(id, motivo);
    res.status(200).json(resultado);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  anular
};
