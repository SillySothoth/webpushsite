using Microsoft.AspNetCore.Mvc;

public class HomeController : Controller
{
    // VAPID ����� (������������ ��� ��������)
    private const string VapidPublicKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

    private static List<PushSubscription> _subscriptions = new List<PushSubscription>();

    public IActionResult Index()
    {
        ViewBag.PublicKey = VapidPublicKey;
        return View();
    }

    [HttpPost]
    public IActionResult Subscribe([FromBody] PushSubscription subscription)
    {
        _subscriptions.Add(subscription);
        Console.WriteLine($"����� ��������: {subscription.Endpoint}");
        return Ok(new { message = "�������� ������� �������!" });
    }

    [HttpGet]
    public IActionResult GetSubscriptions()
    {
        return Ok(_subscriptions);
    }
}